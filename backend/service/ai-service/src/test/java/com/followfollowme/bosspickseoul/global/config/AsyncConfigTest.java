package com.followfollowme.bosspickseoul.global.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AdministrationAnalysisQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AiLlmPort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AiReportCachePort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.CommercialAnalysisQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.DistrictAnalysisQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.RegionAnalysisQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.processor.AiReportProcessor;
import com.followfollowme.bosspickseoul.global.properties.AiLlmProperties;
import com.followfollowme.bosspickseoul.global.properties.AiSourceFetchProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * 원천 데이터 fan-out 풀이 리포트 워커 풀과 분리되어 있는지 고정한다.
 *
 * <p>두 풀이 같은 빈이 되면 워커 스레드가 자기 풀에 조회를 제출한 뒤 그 결과를 기다리는 교착이 된다.
 * 컴파일로는 잡히지 않고 운영에서 잡이 RUNNING 인 채로 타임아웃될 때에야 드러나는 종류의 결함이라
 * 빈 배선 단위로 검증한다.
 */
class AsyncConfigTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
        .withUserConfiguration(AsyncConfig.class, TestPropertiesConfig.class)
        .withPropertyValues(
            "ai.report.source-fetch.core-pool-size=16",
            "ai.report.source-fetch.max-pool-size=16",
            "ai.report.source-fetch.queue-capacity=64",
            "ai.report.source-fetch.await-termination-seconds=30"
        );

    @Test
    @DisplayName("fan-out 풀은 워커 풀과 별개의 빈이며 프로퍼티 값으로 구성된다")
    void aiSourceFetchTaskExecutor_isSeparateFromWorkerPoolAndConfiguredByProperties() {
        contextRunner.run(context -> {
            ThreadPoolTaskExecutor sourceFetch = context.getBean("aiSourceFetchTaskExecutor", ThreadPoolTaskExecutor.class);
            ThreadPoolTaskExecutor worker = context.getBean("aiReportTaskExecutor", ThreadPoolTaskExecutor.class);

            assertThat(sourceFetch).isNotSameAs(worker);
            assertThat(sourceFetch.getCorePoolSize()).isEqualTo(16);
            assertThat(sourceFetch.getMaxPoolSize()).isEqualTo(16);
            assertThat(sourceFetch.getThreadNamePrefix()).isEqualTo("ai-source-fetch-");
        });
    }

    @Test
    @DisplayName("AiReportProcessor 는 워커 풀이 아니라 fan-out 풀을 주입받는다")
    void aiReportProcessor_receivesSourceFetchExecutor() {
        contextRunner
            .withBean(CommercialAnalysisQueryPort.class, () -> mock(CommercialAnalysisQueryPort.class))
            .withBean(DistrictAnalysisQueryPort.class, () -> mock(DistrictAnalysisQueryPort.class))
            .withBean(AdministrationAnalysisQueryPort.class, () -> mock(AdministrationAnalysisQueryPort.class))
            .withBean(RegionAnalysisQueryPort.class, () -> mock(RegionAnalysisQueryPort.class))
            .withBean(AiLlmPort.class, () -> mock(AiLlmPort.class))
            .withBean(AiReportCachePort.class, () -> mock(AiReportCachePort.class))
            .withBean(AiLlmProperties.class, () -> mock(AiLlmProperties.class))
            .withBean(AiReportProcessor.class)
            .run(context -> {
                AiReportProcessor processor = context.getBean(AiReportProcessor.class);

                assertThat(ReflectionTestUtils.getField(processor, "sourceFetchExecutor"))
                    .isSameAs(context.getBean("aiSourceFetchTaskExecutor"))
                    .isNotSameAs(context.getBean("aiReportTaskExecutor"));
            });
    }

    @Configuration(proxyBeanMethods = false)
    @EnableConfigurationProperties(AiSourceFetchProperties.class)
    static class TestPropertiesConfig {

    }
}
