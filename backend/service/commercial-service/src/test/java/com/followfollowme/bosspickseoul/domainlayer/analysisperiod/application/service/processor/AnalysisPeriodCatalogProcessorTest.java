package com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.exception.AnalysisPeriodErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.exception.AnalysisPeriodException;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.model.AnalysisPeriodCatalog;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.port.out.AnalysisDatasetPeriodQueryPort;
import com.followfollowme.bosspickseoul.global.properties.DatasetSpatialVersion;
import com.followfollowme.bosspickseoul.shared.enums.DatasetKey;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.SortedSet;
import java.util.TreeSet;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.transaction.CannotCreateTransactionException;

/**
 * 해석 규칙과 캐시·갱신 동작을 확인한다(이슈 #464).
 *
 * <p>요청 경로({@code resolve}·{@code catalog})는 캐시만 읽어야 한다. 분석 Facade 의 readOnly 트랜잭션 안에서 불리므로 여기서 DB 를
 * 기다리면 커넥션을 쥔 채 줄을 서 풀이 고갈된다. 그래서 요청 경로 테스트는 포트 호출 수가 늘지 않는지를 함께 본다.
 * 공간 스냅샷은 env 와 무관한 명시 값으로 만든다 — Jenkins 는 {@code DATASET_SPATIAL_VERSION} 을 넣고 테스트를 돈다.
 */
class AnalysisPeriodCatalogProcessorTest {

    private static final String SPATIAL_VERSION = "test-snapshot";
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-09-30T20:12:03Z"), ZoneId.of("Asia/Seoul"));

    private final StubPort port = new StubPort();
    private final AnalysisPeriodCatalogProcessor processor =
        new AnalysisPeriodCatalogProcessor(port, new DatasetSpatialVersion(SPATIAL_VERSION), CLOCK);

    private final Logger logger = (Logger) LoggerFactory.getLogger(AnalysisPeriodCatalogProcessor.class);
    private final ListAppender<ILoggingEvent> logs = new ListAppender<>();

    @BeforeEach
    void attachLogs() {
        logs.start();
        logger.addAppender(logs);
    }

    @AfterEach
    void detachLogs() {
        logger.detachAppender(logs);
    }

    @Test
    @DisplayName("카탈로그가 아직 없으면 분기 생략 요청은 기다리지 않고 바로 503 이고 DB 를 치지 않는다")
    void noCatalogIsAnImmediate503WithoutTouchingTheDatabase() {
        assertUnavailable(() -> processor.resolve(null));
        assertUnavailable(processor::catalog);
        assertThat(processor.lastResolvedAt()).isEmpty();
        assertThat(port.calls).isZero();
    }

    @Test
    @DisplayName("갱신하면 원천 중단 데이터셋을 뺀 교집합의 최신 분기가 기본이 되고, 이후 요청은 캐시만 읽는다")
    void refreshedCatalogIsServedFromCacheOnly() {
        port.respond(periods("20254", "20261"), Map.of(DatasetKey.CONSUMPTION_COMMERCIAL, Set.of("20234")));

        AnalysisPeriodCatalog refreshed = processor.refresh();

        assertThat(refreshed.defaultPeriodCode()).isEqualTo("20261");
        assertThat(refreshed.availablePeriodCodes()).containsExactly("20261", "20254");
        assertThat(refreshed.resolvedAt()).isEqualTo(OffsetDateTime.parse("2026-10-01T05:12:03+09:00"));
        assertThat(port.requestedSpatialVersions).containsExactly(SPATIAL_VERSION);
        for (int i = 0; i < 5; i++) {
            assertThat(processor.resolve(null)).isEqualTo("20261");
            assertThat(processor.catalog()).isSameAs(refreshed);
        }
        assertThat(port.calls).as("요청 경로는 포트를 부르지 않는다").isEqualTo(1);
        assertThat(processor.lastResolvedAt()).contains(refreshed.resolvedAt());
    }

    @Test
    @DisplayName("갱신이 실패하면 예외가 나가고 캐시는 마지막 성공값 그대로다")
    void failedRefreshKeepsTheLastGoodCatalog() {
        port.respond(periods("20261"), Map.of());
        AnalysisPeriodCatalog first = processor.refresh();

        port.fail(new DataAccessResourceFailureException("db down"));
        assertThatThrownBy(processor::refresh).isInstanceOf(DataAccessResourceFailureException.class);

        assertThat(processor.catalog()).isSameAs(first);
        assertThat(processor.resolve("")).isEqualTo("20261");
    }

    @Test
    @DisplayName("첫 갱신이 실패하면 503 이 이어지고, 다음 갱신이 성공하면 회복한다")
    void coldStartFailureRecoversOnTheNextRefresh() {
        port.fail(new CannotCreateTransactionException("connection refused"));
        assertThatThrownBy(processor::refresh).isInstanceOf(CannotCreateTransactionException.class);
        assertUnavailable(() -> processor.resolve(null));

        port.respond(periods("20261"), Map.of());
        processor.refresh();

        assertThat(processor.resolve(null)).isEqualTo("20261");
    }

    @Test
    @DisplayName("요청 분기가 있으면 그대로 쓰고 카탈로그가 없어도 된다")
    void explicitPeriodCodeIsUsedAsIs() {
        assertThat(processor.resolve("20233")).isEqualTo("20233");
        assertThat(port.calls).isZero();
    }

    @Test
    @DisplayName("빈 문자열과 공백도 생략으로 보고 기본 분기로 해석한다")
    void blankPeriodCodeResolvesToTheDefault() {
        port.respond(periods("20254", "20261"), Map.of());
        processor.refresh();

        assertThat(processor.resolve("")).isEqualTo("20261");
        assertThat(processor.resolve("  ")).isEqualTo("20261");
        assertThat(processor.resolve(null)).isEqualTo("20261");
    }

    @Test
    @DisplayName("핵심 데이터셋 공통 분기가 없으면 분기 생략 요청은 503 이고 명시 요청은 영향이 없다")
    void noCommonPeriodIsUnavailable() {
        Map<DatasetKey, Set<String>> periods = periods("20261");
        periods.put(DatasetKey.SALES_DISTRICT, Set.of("20254"));
        port.respond(periods, Map.of());
        processor.refresh();

        assertThat(processor.catalog().defaultPeriodCode()).isNull();
        assertUnavailable(() -> processor.resolve(null));
        assertThat(processor.resolve("20254")).isEqualTo("20254");
        assertThat(warnings()).anyMatch(message -> message.contains("no common period"));
    }

    @Test
    @DisplayName("기본 분기 변경 INFO 는 첫 계산과 값이 바뀔 때만 남는다")
    void defaultChangeIsLoggedOnlyWhenItChanges() {
        port.respond(periods("20261"), Map.of());
        processor.refresh();
        processor.refresh();
        port.respond(periods("20261", "20262"), Map.of());
        processor.refresh();

        assertThat(infos()).filteredOn(message -> message.contains("default changed")).hasSize(2);
    }

    @Test
    @DisplayName("기본 분기가 정체돼도 갱신마다 뒤처짐을 평가하고, 같은 상태는 한 번만·바뀌거나 재발하면 다시 WARN")
    void laggingWarningIsEvaluatedOnEveryRefreshAndDeduplicated() {
        Map<DatasetKey, Set<String>> stuck = periods("20253", "20254", "20261", "20262");
        stuck.put(DatasetKey.CHANGE_DISTRICT, Set.of("20253", "20254"));
        port.respond(stuck, Map.of());

        processor.refresh();
        processor.refresh();
        assertThat(lagWarnings()).as("첫 계산은 찍고 같은 상태 반복은 찍지 않는다").hasSize(1);

        stuck.put(DatasetKey.STORE_DISTRICT, Set.of("20253", "20254"));
        port.respond(stuck, Map.of());
        processor.refresh();
        assertThat(lagWarnings()).as("기본 분기는 그대로지만 뒤처진 집합이 바뀌면 다시 찍는다").hasSize(2);

        port.respond(periods("20261", "20262"), Map.of());
        processor.refresh();
        port.respond(stuck, Map.of());
        processor.refresh();
        assertThat(lagWarnings()).as("풀렸다가 재발하면 다시 찍는다").hasSize(3);
        assertThat(lagWarnings().getLast()).contains("default=20254", "newest=20262", "quarters=2");
    }

    private static void assertUnavailable(Runnable call) {
        assertThatThrownBy(call::run)
            .isInstanceOf(AnalysisPeriodException.class)
            .extracting(exception -> ((AnalysisPeriodException) exception).getErrorCode())
            .isEqualTo(AnalysisPeriodErrorCode.DEFAULT_PERIOD_UNAVAILABLE);
        assertThat(AnalysisPeriodErrorCode.DEFAULT_PERIOD_UNAVAILABLE.getHttpStatus().value()).isEqualTo(503);
    }

    private List<String> warnings() {
        return messages(Level.WARN);
    }

    private List<String> infos() {
        return messages(Level.INFO);
    }

    private List<String> lagWarnings() {
        return warnings().stream().filter(message -> message.contains("default lags newest core dataset")).toList();
    }

    private List<String> messages(Level level) {
        return logs.list.stream().filter(event -> event.getLevel() == level).map(ILoggingEvent::getFormattedMessage).toList();
    }

    private static Map<DatasetKey, Set<String>> periods(String... periodCodes) {
        Map<DatasetKey, Set<String>> periods = new EnumMap<>(DatasetKey.class);
        for (DatasetKey dataset : DatasetKey.values()) {
            periods.put(dataset, Set.of(periodCodes));
        }
        return periods;
    }

    private static final class StubPort implements AnalysisDatasetPeriodQueryPort {

        private final List<String> requestedSpatialVersions = new ArrayList<>();
        private int calls;
        private Map<DatasetKey, SortedSet<String>> response;
        private RuntimeException failure;

        void respond(Map<DatasetKey, Set<String>> base, Map<DatasetKey, Set<String>> overrides) {
            Map<DatasetKey, SortedSet<String>> merged = new EnumMap<>(DatasetKey.class);
            base.forEach((dataset, periodCodes) -> merged.put(dataset, new TreeSet<>(periodCodes)));
            overrides.forEach((dataset, periodCodes) -> merged.put(dataset, new TreeSet<>(periodCodes)));
            this.response = merged;
            this.failure = null;
        }

        void fail(RuntimeException failure) {
            this.failure = failure;
        }

        @Override
        public Map<DatasetKey, SortedSet<String>> findPeriodCodesByDataset(String spatialVersion) {
            calls++;
            requestedSpatialVersions.add(spatialVersion);
            if (failure != null) {
                throw failure;
            }
            return response;
        }
    }
}
