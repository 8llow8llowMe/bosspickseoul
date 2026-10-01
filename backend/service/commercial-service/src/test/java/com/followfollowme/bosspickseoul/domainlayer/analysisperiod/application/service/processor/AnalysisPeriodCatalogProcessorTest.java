package com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.exception.AnalysisPeriodErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.exception.AnalysisPeriodException;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.model.AnalysisPeriodCatalog;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.port.out.AnalysisDatasetPeriodQueryPort;
import com.followfollowme.bosspickseoul.global.properties.AnalysisPeriodProperties;
import com.followfollowme.bosspickseoul.global.properties.DatasetSpatialVersion;
import com.followfollowme.bosspickseoul.shared.enums.DatasetKey;
import java.time.Clock;
import java.time.Duration;
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
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.transaction.CannotCreateTransactionException;

/**
 * 해석 규칙과 캐시 동작을 고정한 시계로 확인한다(이슈 #464).
 *
 * <p>공간 스냅샷은 env 를 읽지 않도록 명시 값으로 만든다 — Jenkins 는 {@code DATASET_SPATIAL_VERSION} 을 넣고 테스트를 돈다.
 */
class AnalysisPeriodCatalogProcessorTest {

    private static final String SPATIAL_VERSION = "test-snapshot";
    private static final Duration TTL = Duration.ofMinutes(5);
    private static final Instant START = Instant.parse("2026-09-30T20:12:03Z");

    private final MutableClock clock = new MutableClock(START);
    private final StubPort port = new StubPort();
    private final AnalysisPeriodCatalogProcessor processor = new AnalysisPeriodCatalogProcessor(
        port, new DatasetSpatialVersion(SPATIAL_VERSION), new AnalysisPeriodProperties(TTL), clock);

    @Test
    @DisplayName("기본 분기는 원천 중단 데이터셋을 뺀 교집합의 최신 분기이고 명시한 공간 스냅샷으로 질의한다")
    void defaultIsTheNewestCommonPeriodExcludingDiscontinuedSources() {
        port.respond(periods("20254", "20261"), Map.of(DatasetKey.CONSUMPTION_COMMERCIAL, Set.of("20234")));

        AnalysisPeriodCatalog catalog = processor.catalog();

        assertThat(catalog.defaultPeriodCode()).isEqualTo("20261");
        assertThat(catalog.availablePeriodCodes()).containsExactly("20261", "20254");
        assertThat(catalog.spatialVersion()).isEqualTo(SPATIAL_VERSION);
        assertThat(catalog.resolvedAt()).isEqualTo(OffsetDateTime.parse("2026-10-01T05:12:03+09:00"));
        assertThat(port.requestedSpatialVersions).containsExactly(SPATIAL_VERSION);
    }

    @Test
    @DisplayName("TTL 안에서는 다시 질의하지 않고 TTL 이 지나면 다시 계산한다")
    void cachesWithinTheTtlAndRecomputesAfterIt() {
        port.respond(periods("20261"), Map.of());
        processor.catalog();

        clock.advance(TTL.minusSeconds(1));
        processor.catalog();
        assertThat(port.calls()).isEqualTo(1);

        port.respond(periods("20261", "20262"), Map.of());
        clock.advance(Duration.ofSeconds(1));
        assertThat(processor.catalog().defaultPeriodCode()).isEqualTo("20262");
        assertThat(port.calls()).isEqualTo(2);
    }

    @Test
    @DisplayName("재계산이 DB 오류면 마지막 성공값을 계속 쓰고 다음 재시도는 TTL 뒤로 미룬다")
    void servesTheLastGoodCatalogWhenRefreshFails() {
        port.respond(periods("20261"), Map.of());
        AnalysisPeriodCatalog first = processor.catalog();

        clock.advance(TTL);
        port.fail(new DataAccessResourceFailureException("db down"));
        assertThat(processor.catalog()).isSameAs(first);
        assertThat(processor.resolve(null)).isEqualTo("20261");
        assertThat(port.calls()).isEqualTo(2);

        clock.advance(TTL.minusSeconds(1));
        processor.catalog();
        assertThat(port.calls()).as("실패 직후에는 TTL 동안 DB 를 다시 두드리지 않는다").isEqualTo(2);

        port.respond(periods("20261", "20262"), Map.of());
        clock.advance(Duration.ofSeconds(1));
        assertThat(processor.catalog().defaultPeriodCode()).isEqualTo("20262");
    }

    @Test
    @DisplayName("한 번도 계산하지 못했으면 분기 생략 요청은 503 이고 DB 가 살아나면 다음 요청이 계산한다")
    void coldStartFailureIsUnavailableUntilTheDatabaseRecovers() {
        port.fail(new CannotCreateTransactionException("connection refused"));

        assertThatThrownBy(() -> processor.resolve(null))
            .isInstanceOf(AnalysisPeriodException.class)
            .extracting(exception -> ((AnalysisPeriodException) exception).getErrorCode())
            .isEqualTo(AnalysisPeriodErrorCode.DEFAULT_PERIOD_UNAVAILABLE);
        assertThat(AnalysisPeriodErrorCode.DEFAULT_PERIOD_UNAVAILABLE.getHttpStatus().value()).isEqualTo(503);

        port.respond(periods("20261"), Map.of());
        assertThat(processor.resolve(null)).isEqualTo("20261");
    }

    @Test
    @DisplayName("요청 분기가 있으면 그대로 쓰고 카탈로그를 읽지 않는다")
    void explicitPeriodCodeIsUsedAsIs() {
        port.fail(new DataAccessResourceFailureException("db down"));

        assertThat(processor.resolve("20233")).isEqualTo("20233");
        assertThat(port.calls()).isZero();
    }

    @Test
    @DisplayName("빈 문자열과 공백도 생략으로 보고 기본 분기로 해석한다")
    void blankPeriodCodeResolvesToTheDefault() {
        port.respond(periods("20254", "20261"), Map.of());

        assertThat(processor.resolve("")).isEqualTo("20261");
        assertThat(processor.resolve("  ")).isEqualTo("20261");
        assertThat(processor.resolve(null)).isEqualTo("20261");
    }

    @Test
    @DisplayName("핵심 데이터셋 공통 분기가 없으면 분기 생략 요청은 503 이다")
    void noCommonPeriodIsUnavailable() {
        Map<DatasetKey, Set<String>> periods = periods("20261");
        periods.put(DatasetKey.SALES_DISTRICT, Set.of("20254"));
        port.respond(periods, Map.of());

        assertThat(processor.catalog().defaultPeriodCode()).isNull();
        assertThatThrownBy(() -> processor.resolve(null)).isInstanceOf(AnalysisPeriodException.class);
        assertThat(processor.resolve("20254")).isEqualTo("20254");
    }

    @Test
    @DisplayName("만료 뒤 한 요청이 재계산하는 동안 다른 요청은 기다리지 않고 직전 값을 받는다")
    void otherRequestsServeStaleWhileOneRefreshes() throws Exception {
        port.respond(periods("20261"), Map.of());
        AnalysisPeriodCatalog first = processor.catalog();
        clock.advance(TTL);

        CountDownLatch refreshing = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        port.block(refreshing, release, periods("20261", "20262"));
        CompletableFuture<AnalysisPeriodCatalog> refresher = CompletableFuture.supplyAsync(processor::catalog);
        assertThat(refreshing.await(5, TimeUnit.SECONDS)).isTrue();

        assertThat(processor.catalog()).isSameAs(first);

        release.countDown();
        assertThat(refresher.get(5, TimeUnit.SECONDS).defaultPeriodCode()).isEqualTo("20262");
        assertThat(processor.catalog().defaultPeriodCode()).isEqualTo("20262");
        assertThat(port.calls()).isEqualTo(2);
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
        private volatile Map<DatasetKey, SortedSet<String>> response;
        private volatile RuntimeException failure;
        private volatile CountDownLatch entered;
        private volatile CountDownLatch release;

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

        void block(CountDownLatch entered, CountDownLatch release, Map<DatasetKey, Set<String>> next) {
            respond(next, Map.of());
            this.entered = entered;
            this.release = release;
        }

        synchronized int calls() {
            return requestedSpatialVersions.size();
        }

        @Override
        public Map<DatasetKey, SortedSet<String>> findPeriodCodesByDataset(String spatialVersion) {
            synchronized (this) {
                requestedSpatialVersions.add(spatialVersion);
            }
            CountDownLatch gate = release;
            if (gate != null) {
                entered.countDown();
                try {
                    gate.await(5, TimeUnit.SECONDS);
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                }
                release = null;
            }
            if (failure != null) {
                throw failure;
            }
            return response;
        }
    }

    private static final class MutableClock extends Clock {

        private volatile Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneId.of("Asia/Seoul");
        }

        @Override
        public Clock withZone(ZoneId zone) {
            throw new UnsupportedOperationException();
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
