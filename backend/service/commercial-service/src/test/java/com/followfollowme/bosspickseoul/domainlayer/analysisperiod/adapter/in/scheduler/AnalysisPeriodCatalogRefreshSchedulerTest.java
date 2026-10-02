package com.followfollowme.bosspickseoul.domainlayer.analysisperiod.adapter.in.scheduler;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.exception.AnalysisPeriodException;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.port.out.AnalysisDatasetPeriodQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.service.processor.AnalysisPeriodCatalogProcessor;
import com.followfollowme.bosspickseoul.global.properties.AnalysisPeriodProperties;
import com.followfollowme.bosspickseoul.global.properties.DatasetSpatialVersion;
import com.followfollowme.bosspickseoul.shared.enums.DatasetKey;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.EnumMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.SortedSet;
import java.util.TreeSet;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 갱신 트리거가 짧은 tick 으로 깨어나되 정상 상태에서는 TTL 마다만 DB 를 읽고, 실패하면 다음 tick 에 다시 시도하며, 예외를 삼키는지
 * 확인한다(이슈 #464). {@code 5m}·{@code 30s} 형식을 {@code fixedDelayString} 이 그대로 받아 기동 직후 바로 도는지도 본다.
 */
class AnalysisPeriodCatalogRefreshSchedulerTest {

    private static final Duration TTL = Duration.ofMinutes(5);
    private static final Duration TICK = Duration.ofSeconds(30);
    private static final AnalysisPeriodProperties PROPERTIES = new AnalysisPeriodProperties(TTL, TICK);

    @Test
    @DisplayName("첫 갱신이 실패하면 TTL 을 기다리지 않고 다음 tick 에 회복하고, 성공한 뒤에는 TTL 이 지나야 다시 읽는다")
    void retriesOnTheNextTickAndThenWaitsForTheTtl() {
        MutableClock clock = new MutableClock(Instant.parse("2026-10-01T00:00:00Z"));
        CountingPort port = new CountingPort();
        AnalysisPeriodCatalogProcessor processor = new AnalysisPeriodCatalogProcessor(port, new DatasetSpatialVersion("test-snapshot"), clock);
        AnalysisPeriodCatalogRefreshScheduler scheduler = new AnalysisPeriodCatalogRefreshScheduler(processor, PROPERTIES);

        port.failing = true;
        scheduler.refreshCatalog();
        assertThatThrownBy(() -> processor.resolve(null)).isInstanceOf(AnalysisPeriodException.class);

        port.failing = false;
        clock.advance(TICK);
        scheduler.refreshCatalog();
        assertThat(processor.resolve(null)).as("한 tick(30초) 뒤 회복한다").isEqualTo("20261");
        assertThat(port.calls).isEqualTo(2);

        clock.advance(TTL.minus(TICK));
        scheduler.refreshCatalog();
        assertThat(port.calls).as("성공 상태에서는 TTL 전에 다시 읽지 않는다").isEqualTo(2);

        clock.advance(TICK);
        scheduler.refreshCatalog();
        assertThat(port.calls).as("TTL 이 지나면 다시 읽는다").isEqualTo(3);
    }

    @Test
    @DisplayName("성공 뒤 갱신이 실패하면 마지막 성공값을 유지하고 다음 tick 에 다시 시도한다")
    void keepsStaleAndRetriesEveryTickAfterAFailure() {
        MutableClock clock = new MutableClock(Instant.parse("2026-10-01T00:00:00Z"));
        CountingPort port = new CountingPort();
        AnalysisPeriodCatalogProcessor processor = new AnalysisPeriodCatalogProcessor(port, new DatasetSpatialVersion("test-snapshot"), clock);
        AnalysisPeriodCatalogRefreshScheduler scheduler = new AnalysisPeriodCatalogRefreshScheduler(processor, PROPERTIES);
        scheduler.refreshCatalog();

        port.failing = true;
        clock.advance(TTL);
        scheduler.refreshCatalog();
        clock.advance(TICK);
        scheduler.refreshCatalog();

        assertThat(processor.resolve(null)).isEqualTo("20261");
        assertThat(port.calls).as("실패 동안은 tick 마다 다시 시도한다").isEqualTo(3);
    }

    @Test
    @DisplayName("갱신이 실패해도 예외를 던지지 않는다 — 카탈로그가 있을 때와 없을 때 모두")
    void swallowsRefreshFailures() {
        AnalysisPeriodCatalogProcessor withCatalog = mock(AnalysisPeriodCatalogProcessor.class);
        when(withCatalog.refreshDue(any())).thenReturn(true);
        when(withCatalog.refresh()).thenThrow(new DataAccessResourceFailureException("db down"));
        when(withCatalog.lastResolvedAt()).thenReturn(Optional.of(OffsetDateTime.parse("2026-10-01T05:12:03+09:00")));
        AnalysisPeriodCatalogProcessor withoutCatalog = mock(AnalysisPeriodCatalogProcessor.class);
        when(withoutCatalog.refreshDue(any())).thenReturn(true);
        when(withoutCatalog.refresh()).thenThrow(new IllegalStateException("unexpected"));
        when(withoutCatalog.lastResolvedAt()).thenReturn(Optional.empty());

        assertThatCode(() -> new AnalysisPeriodCatalogRefreshScheduler(withCatalog, PROPERTIES).refreshCatalog()).doesNotThrowAnyException();
        assertThatCode(() -> new AnalysisPeriodCatalogRefreshScheduler(withoutCatalog, PROPERTIES).refreshCatalog()).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("30s 형식 tick 을 받아 기동 직후(initialDelay=0) 갱신을 한 번 돌린다")
    void runsImmediatelyWithASimpleDurationTick() {
        AnalysisPeriodCatalogProcessor processor = mock(AnalysisPeriodCatalogProcessor.class);
        when(processor.refreshDue(TTL)).thenReturn(true);

        new ApplicationContextRunner()
            .withPropertyValues("app.analysis-period.refresh-tick=30s")
            .withBean(AnalysisPeriodCatalogProcessor.class, () -> processor)
            .withBean(AnalysisPeriodProperties.class, () -> PROPERTIES)
            .withUserConfiguration(SchedulingTestConfig.class)
            .run(context -> verify(processor, timeout(5_000)).refresh());
    }

    @Configuration(proxyBeanMethods = false)
    @EnableScheduling
    static class SchedulingTestConfig {

        @Bean
        AnalysisPeriodCatalogRefreshScheduler analysisPeriodCatalogRefreshScheduler(
            AnalysisPeriodCatalogProcessor processor, AnalysisPeriodProperties properties
        ) {
            return new AnalysisPeriodCatalogRefreshScheduler(processor, properties);
        }
    }

    private static final class CountingPort implements AnalysisDatasetPeriodQueryPort {

        private int calls;
        private boolean failing;

        @Override
        public Map<DatasetKey, SortedSet<String>> findPeriodCodesByDataset(String spatialVersion) {
            calls++;
            if (failing) {
                throw new DataAccessResourceFailureException("db down");
            }
            Map<DatasetKey, SortedSet<String>> periods = new EnumMap<>(DatasetKey.class);
            for (DatasetKey dataset : DatasetKey.values()) {
                periods.put(dataset, new TreeSet<>(Set.of("20254", "20261")));
            }
            return periods;
        }
    }

    private static final class MutableClock extends Clock {

        private Instant now;

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
