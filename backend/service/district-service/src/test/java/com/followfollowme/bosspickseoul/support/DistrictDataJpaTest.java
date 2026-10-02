package com.followfollowme.bosspickseoul.support;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Inherited;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * district-service 의 JPA 슬라이스 테스트 애노테이션. {@code @DataJpaTest} 대신 이것을 쓴다.
 *
 * <p>{@code @DataJpaTest} 에 env 프로필 격리를 묶는다. 슬라이스는 앱 클래스의 {@code @EnableFeignClients} 까지 올려서, env 에
 * {@code SPRING_PROFILES_ACTIVE=dev} 만 있고 {@code COMMERCIAL_SERVICE_APP_NAME} 이 없으면 {@code application-dev.yml} 의
 * {@code ${COMMERCIAL_SERVICE_APP_NAME}} 이 풀리지 않아 Feign 클라이언트 등록에서 컨텍스트가 죽는다(Jenkins 는 Vault env 를 다 넣어
 * 우연히 통과한다). {@link #PROFILE} 로 env 프로필을 가려 {@code application.yml} 기본값만으로 뜨게 한다. 이 이름의
 * {@code application-*.yml} 은 두지 않는다. commercial-service 의 {@code CommercialDataJpaTest} 와 같은 방식이다.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Inherited
@DataJpaTest
@ActiveProfiles(DistrictDataJpaTest.PROFILE)
public @interface DistrictDataJpaTest {

    /** env 의 {@code SPRING_PROFILES_ACTIVE} 를 가리는 슬라이스 전용 프로필. */
    String PROFILE = "slice-test";
}
