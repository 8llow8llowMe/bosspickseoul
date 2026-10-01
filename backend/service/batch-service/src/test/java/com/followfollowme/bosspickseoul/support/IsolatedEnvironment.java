package com.followfollowme.bosspickseoul.support;

import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.core.env.StandardEnvironment;

/**
 * OS 환경변수·JVM 시스템 속성이 섞이지 않는 테스트 환경.
 *
 * <p>Jenkins 는 Vault env 전체({@code SPRING_PROFILES_ACTIVE=dev}, 롤아웃 뒤 {@code BATCH_POLICY_ENABLED=true} 등)를 넣고
 * {@code :test} 를 돈다. 그대로 두면 {@code @ConditionalOnProperty}·설정 바인딩이 env 플래그를 읽고, Boot 3.5 는 코드로 정한 활성
 * 프로파일에 env 프로파일을 합친다({@code [quarterly, dev]}). 그래서 환경에 따라 결과가 바뀌는 테스트가 된다.
 * {@code QuarterlyImportRunnerTest} 와 같은 방식으로 두 property source 를 걷어 낸다.
 */
public final class IsolatedEnvironment {

    private IsolatedEnvironment() {
    }

    /** 시스템 env·시스템 속성 property source 를 걷어 낸 환경. 테스트가 필요한 값만 직접 넣는다. */
    public static StandardEnvironment create() {
        StandardEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().remove(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME);
        environment.getPropertySources().remove(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME);
        return environment;
    }

    /** 실행마다 {@link #create()} 환경을 쓰는 컨텍스트 러너. {@code withPropertyValues} 는 그대로 쓴다. */
    public static ApplicationContextRunner contextRunner() {
        return new ApplicationContextRunner(() -> {
            AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext();
            context.setEnvironment(create());
            return context;
        });
    }
}
