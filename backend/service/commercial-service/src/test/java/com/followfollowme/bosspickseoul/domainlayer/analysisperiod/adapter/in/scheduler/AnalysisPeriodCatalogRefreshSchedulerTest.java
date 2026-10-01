package com.followfollowme.bosspickseoul.domainlayer.analysisperiod.adapter.in.scheduler;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.service.processor.AnalysisPeriodCatalogProcessor;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 갱신 트리거가 예외를 삼키고, {@code app.analysis-period.cache-ttl} 의 {@code 5m} 형식을 {@code fixedDelayString} 이 그대로 받아
 * 기동 직후 바로 한 번 도는지 확인한다(이슈 #464).
 */
class AnalysisPeriodCatalogRefreshSchedulerTest {

    @Test
    @DisplayName("갱신이 실패해도 예외를 던지지 않는다 — 카탈로그가 있을 때와 없을 때 모두")
    void swallowsRefreshFailures() {
        AnalysisPeriodCatalogProcessor withCatalog = mock(AnalysisPeriodCatalogProcessor.class);
        when(withCatalog.refresh()).thenThrow(new DataAccessResourceFailureException("db down"));
        when(withCatalog.lastResolvedAt()).thenReturn(Optional.of(OffsetDateTime.parse("2026-10-01T05:12:03+09:00")));
        AnalysisPeriodCatalogProcessor withoutCatalog = mock(AnalysisPeriodCatalogProcessor.class);
        when(withoutCatalog.refresh()).thenThrow(new IllegalStateException("unexpected"));
        when(withoutCatalog.lastResolvedAt()).thenReturn(Optional.empty());

        assertThatCode(() -> new AnalysisPeriodCatalogRefreshScheduler(withCatalog).refreshCatalog()).doesNotThrowAnyException();
        assertThatCode(() -> new AnalysisPeriodCatalogRefreshScheduler(withoutCatalog).refreshCatalog()).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("5m 형식 주기를 받아 기동 직후(initialDelay=0) 갱신을 한 번 돌린다")
    void runsImmediatelyWithASimpleDurationInterval() {
        AnalysisPeriodCatalogProcessor processor = mock(AnalysisPeriodCatalogProcessor.class);

        new ApplicationContextRunner()
            .withPropertyValues("app.analysis-period.cache-ttl=5m")
            .withBean(AnalysisPeriodCatalogProcessor.class, () -> processor)
            .withUserConfiguration(SchedulingTestConfig.class)
            .run(context -> verify(processor, timeout(5_000)).refresh());
    }

    @Configuration(proxyBeanMethods = false)
    @EnableScheduling
    static class SchedulingTestConfig {

        @Bean
        AnalysisPeriodCatalogRefreshScheduler analysisPeriodCatalogRefreshScheduler(AnalysisPeriodCatalogProcessor processor) {
            return new AnalysisPeriodCatalogRefreshScheduler(processor);
        }
    }
}
