package com.followfollowme.bosspickseoul.global.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.support.IsolatedEnvironment;
import java.util.Map;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.context.config.ConfigDataEnvironmentPostProcessor;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

/**
 * Quartz JobStore 는 프로파일로만 갈린다. {@code spring.config.activate.on-property} 는 Spring Boot 3.5 가 지원하지 않는 키라
 * 조건 문서가 모든 프로파일에 적용되던 문제가 있었다(이슈 #445 리뷰).
 *
 * <ul>
 *   <li>상시 컨테이너(dev, prod): JDBC 클러스터 JobStore, 자동 시작</li>
 *   <li>quarterly CLI · local: 메모리 스토어, 자동 시작 안 함. CLI 가 commercial 의 {@code QRTZ_*} 에 붙어 저장된 트리거를 발화하지 않는다</li>
 * </ul>
 * OS 환경변수·시스템 속성은 걷어 낸다({@code IsolatedEnvironment}). Jenkins 가 {@code SPRING_PROFILES_ACTIVE=dev} 를 넣고 테스트를 돌리면
 * Boot 3.5 가 코드로 정한 프로파일에 env 프로파일을 합쳐({@code [quarterly, dev]}) dev 의 JDBC 설정이 quarterly 를 덮기 때문이다.
 */
class QuartzJobStoreProfileTest {

    @ParameterizedTest
    @ValueSource(strings = {"dev", "prod"})
    void alwaysOnProfilesUseTheClusteredJdbcJobStore(String profile) {
        StandardEnvironment environment = environment(profile, Map.of());

        assertThat(environment.getProperty("spring.quartz.job-store-type")).isEqualTo("jdbc");
        assertThat(environment.getProperty("spring.quartz.auto-startup")).isEqualTo("true");
        assertThat(environment.getProperty("spring.quartz.jdbc.initialize-schema")).isEqualTo("never");
        assertThat(environment.getProperty("spring.quartz.properties.org.quartz.jobStore.isClustered")).isEqualTo("true");
    }

    @ParameterizedTest
    @ValueSource(strings = {"quarterly", "local"})
    void oneShotAndLocalProfilesNeverStartTheScheduler(String profile) {
        // 켜진 플래그가 있어도 메모리 스토어다. 예전에는 on-property 문서가 무시돼 이 경우에도 JDBC 로 떴다.
        StandardEnvironment environment = environment(profile, Map.of("batch.policy.enabled", "true", "batch.dataset-refresh.enabled", "true"));

        assertThat(environment.getProperty("spring.quartz.job-store-type")).isEqualTo("memory");
        assertThat(environment.getProperty("spring.quartz.auto-startup")).isEqualTo("false");
        assertThat(environment.getProperty("spring.quartz.properties.org.quartz.jobStore.isClustered")).isNull();
    }

    private static StandardEnvironment environment(String profile, Map<String, Object> properties) {
        StandardEnvironment environment = IsolatedEnvironment.create();
        // System properties 는 JVM 전역이라 다른 테스트로 샌다. 이 환경에만 붙인다.
        environment.getPropertySources().addFirst(new MapPropertySource("test", properties));
        environment.setActiveProfiles(profile);
        ConfigDataEnvironmentPostProcessor.applyTo(environment);
        return environment;
    }
}
