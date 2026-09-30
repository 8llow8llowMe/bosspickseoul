package com.followfollowme.bosspickseoul.global.properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.config.ConfigDataEnvironmentPostProcessor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

class DatasetRefreshPropertiesTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner().withUserConfiguration(EnableTargetProperties.class);

    @Test
    void bindsTheRolloutDefaults() {
        runner.run(context -> {
            assertThat(context).hasNotFailed();
            DatasetRefreshProperties properties = context.getBean(DatasetRefreshProperties.class);
            assertThat(properties.enabled()).isFalse();
            assertThat(properties.publish()).as("롤아웃은 publish=false 로 시작한다").isFalse();
            assertThat(properties.cron()).isEqualTo("0 0 5 * * ?");
            assertThat(properties.maxQuartersPerRun()).isEqualTo(1);
            assertThat(properties.maxApiCallsPerRun()).isEqualTo(600);
            assertThat(properties.spatialVersion()).isEqualTo("legacy-20233");
        });
    }

    @Test
    void blankCronFromAnEmptyEnvironmentVariableFallsBackToFiveAm() {
        runner.withPropertyValues("batch.dataset-refresh.cron=", "batch.dataset-refresh.publish=true")
            .run(context -> {
                DatasetRefreshProperties properties = context.getBean(DatasetRefreshProperties.class);
                assertThat(properties.cron()).isEqualTo(DatasetRefreshProperties.DEFAULT_CRON);
                assertThat(properties.publish()).isTrue();
            });
    }

    @Test
    void rejectsABudgetAboveTheDailyApiLimit() {
        assertThatThrownBy(() -> new DatasetRefreshProperties(true, null, false, null, null, 1001, 1, 0.2, 7))
            .hasMessageContaining("max-api-calls-per-run");
    }

    /** application.yml 의 실제 값. 사용자 결정(05:00, publish=false, 분기 1)이 기본값으로 남아 있는지 본다. */
    @Test
    void applicationYamlKeepsTheAgreedDefaults() {
        StandardEnvironment environment = new StandardEnvironment();
        environment.setActiveProfiles("quarterly");
        ConfigDataEnvironmentPostProcessor.applyTo(environment);

        assertThat(environment.getProperty("batch.dataset-refresh.enabled")).isEqualTo("false");
        assertThat(environment.getProperty("batch.dataset-refresh.publish")).isEqualTo("false");
        assertThat(environment.getProperty("batch.dataset-refresh.cron")).isEqualTo("0 0 5 * * ?");
        assertThat(environment.getProperty("batch.dataset-refresh.max-quarters-per-run")).isEqualTo("1");
        assertThat(environment.getProperty("batch.dataset-source.raw-directory")).isEqualTo("./data/raw");
    }

    /**
     * 자동 최신화는 Quartz JDBC JobStore 로 돈다. application.yml 의 on-property 문서는 Boot 가 조건으로 읽지 않아 항상 적용되는데,
     * 나중에 누가 정책 플래그만 보는 조건으로 고치면 자동 최신화 트리거가 메모리 스케줄러에 올라가 클러스터 락이 사라진다.
     */
    @Test
    void quartzUsesTheJdbcJobStoreWhenRefreshIsEnabled() {
        StandardEnvironment environment = new StandardEnvironment();
        // getSystemProperties() 는 JVM 전역이라 다른 테스트로 샌다. 이 환경에만 붙인다.
        environment.getPropertySources().addFirst(new MapPropertySource("test", Map.of("batch.dataset-refresh.enabled", "true")));
        environment.setActiveProfiles("dev");
        ConfigDataEnvironmentPostProcessor.applyTo(environment);

        assertThat(environment.getProperty("spring.quartz.job-store-type")).isEqualTo("jdbc");
        assertThat(environment.getProperty("spring.quartz.auto-startup")).isEqualTo("true");
        assertThat(environment.getProperty("spring.quartz.properties.org.quartz.jobStore.isClustered")).isEqualTo("true");
    }

    @Configuration(proxyBeanMethods = false)
    @EnableConfigurationProperties(DatasetRefreshProperties.class)
    static class EnableTargetProperties {
    }
}
