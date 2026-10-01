package com.followfollowme.bosspickseoul.global.properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.bosspickseoul.support.IsolatedEnvironment;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.config.ConfigDataEnvironmentPostProcessor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.StandardEnvironment;

class DatasetRefreshPropertiesTest {

    private final ApplicationContextRunner runner = IsolatedEnvironment.contextRunner().withUserConfiguration(EnableTargetProperties.class);

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
            assertThat(properties.reprojectFrom()).as("레거시 20211~20233 은 자동 재이관하지 않는다").isEqualTo("20234");
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
        assertThatThrownBy(() -> new DatasetRefreshProperties(true, null, false, null, null, 1001, 1, 0.2, 7, null))
            .hasMessageContaining("max-api-calls-per-run");
    }

    @Test
    void rejectsAMalformedReprojectFromQuarter() {
        assertThatThrownBy(() -> new DatasetRefreshProperties(true, null, false, null, null, 600, 1, 0.2, 7, "2023"))
            .hasMessageContaining("reproject-from");
    }

    /** application.yml 의 실제 값. 사용자 결정(05:00, publish=false, 분기 1)이 기본값으로 남아 있는지 본다. */
    @Test
    void applicationYamlKeepsTheAgreedDefaults() {
        StandardEnvironment environment = IsolatedEnvironment.create();
        environment.setActiveProfiles("quarterly");
        ConfigDataEnvironmentPostProcessor.applyTo(environment);

        assertThat(environment.getProperty("batch.dataset-refresh.enabled")).isEqualTo("false");
        assertThat(environment.getProperty("batch.dataset-refresh.publish")).isEqualTo("false");
        assertThat(environment.getProperty("batch.dataset-refresh.cron")).isEqualTo("0 0 5 * * ?");
        assertThat(environment.getProperty("batch.dataset-refresh.max-quarters-per-run")).isEqualTo("1");
        assertThat(environment.getProperty("batch.dataset-refresh.reproject-from")).isEqualTo("20234");
        assertThat(environment.getProperty("batch.dataset-source.raw-directory")).isEqualTo("./data/raw");
    }

    @Configuration(proxyBeanMethods = false)
    @EnableConfigurationProperties(DatasetRefreshProperties.class)
    static class EnableTargetProperties {
    }
}
