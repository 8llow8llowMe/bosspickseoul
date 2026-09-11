package com.followfollowme.bosspickseoul.global.properties;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;

/**
 * 설정 바인딩이 실제로 붙는지 고정한다.
 *
 * <p>record 에 생성자가 둘이면 Spring 은 어느 쪽으로 바인딩할지 고르지 못하고 JavaBean 바인딩으로 떨어진다.
 * record 에는 기본 생성자가 없으므로 그 순간 {@code No default constructor found} 로 기동이 깨진다.
 * 편의 생성자를 하나 더 두는 것만으로 batch-service 전체가 뜨지 않았으므로 여기서 못 박는다.
 */
class PolicyIngestionPropertiesBindingTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
        .withUserConfiguration(EnableTargetProperties.class);

    @Test
    @DisplayName("기본값만으로 바인딩된다")
    void bindsWithDefaults() {
        runner.withPropertyValues(
                "batch.policy.stale-ratio=0.5",
                "batch.policy.purge-grace-days=7")
            .run(context -> {
                assertThat(context).hasNotFailed();
                PolicyIngestionProperties properties = context.getBean(PolicyIngestionProperties.class);
                assertThat(properties.enabled()).isFalse();
                assertThat(properties.collectCron()).isEqualTo("0 0 6 * * ?");
                assertThat(properties.bizinfo()).isNotNull();
                assertThat(properties.datasource()).isNotNull();
                assertThat(properties.datasource().hasUrl()).isFalse();
            });
    }

    @Test
    @DisplayName("datasource 하위 속성까지 바인딩된다")
    void bindsDatasource() {
        runner.withPropertyValues(
                "batch.policy.enabled=true",
                "batch.policy.stale-ratio=0.5",
                "batch.policy.purge-grace-days=7",
                "batch.policy.datasource.url=jdbc:mysql://localhost:3306/commercial",
                "batch.policy.datasource.username=user",
                "batch.policy.datasource.password=secret")
            .run(context -> {
                assertThat(context).hasNotFailed();
                PolicyIngestionProperties.Datasource datasource =
                    context.getBean(PolicyIngestionProperties.class).datasource();
                assertThat(datasource.url()).isEqualTo("jdbc:mysql://localhost:3306/commercial");
                assertThat(datasource.username()).isEqualTo("user");
                assertThat(datasource.driverClassName()).isEqualTo("com.mysql.cj.jdbc.Driver");
            });
    }

    @Configuration(proxyBeanMethods = false)
    @EnableConfigurationProperties(PolicyIngestionProperties.class)
    static class EnableTargetProperties {
    }
}
