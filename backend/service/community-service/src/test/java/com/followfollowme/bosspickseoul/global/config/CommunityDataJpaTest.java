package com.followfollowme.bosspickseoul.global.config;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Inherited;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * community-service 의 JPA 슬라이스 테스트 애노테이션. {@code @DataJpaTest} 대신 이것을 쓴다.
 *
 * <p>{@code @DataJpaTest} 에 env 프로필 격리({@link DataJpaSliceTestConfig#PROFILE})를 묶는다. 슬라이스는 앱 클래스의
 * {@code @EnableFeignClients} 까지 올려서, env 에 {@code SPRING_PROFILES_ACTIVE=dev} 만 있고 {@code DISTRICT_SERVICE_APP_NAME}·
 * {@code AUTH_SERVICE_APP_NAME} 이 없으면 {@code application-dev.yml} 의 플레이스홀더가 풀리지 않아 컨텍스트가 죽는다. 슬라이스에 필요한 빈은
 * {@link DataJpaSliceTestConfig} 가 imports 파일로 자동 추가하므로 이 애노테이션 하나면 된다. DB 는 {@code @DataJpaTest} 기본값대로
 * 임베디드 H2 로 바뀌고 스키마는 엔티티로 매번 새로 만든다.
 *
 * <p>MySQL 에서만 확인되는 동작(동시성·REPEATABLE READ 격리·콜레이션 비교·실행계획 등)은 이 슬라이스가 아니라
 * {@code CommunityRepositoryMySqlConcurrencyTest} 몫이다. H2 에서는 {@code @Enumerated(STRING)} 컬럼이 H2 네이티브 {@code enum(...)} 타입으로
 * 만들어져 MySQL 의 {@code varchar} + CHECK 와 컬럼 정의도 다르다.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Inherited
@DataJpaTest
@ActiveProfiles(DataJpaSliceTestConfig.PROFILE)
public @interface CommunityDataJpaTest {
}
