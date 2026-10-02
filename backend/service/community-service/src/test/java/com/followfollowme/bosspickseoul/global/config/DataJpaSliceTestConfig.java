package com.followfollowme.bosspickseoul.global.config;

import com.followfollowme.bosspickseoul.persistence.config.QuerydslConfigurer;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;

/**
 * {@code @DataJpaTest} 슬라이스가 이 서비스의 리포지터리를 올릴 때 반드시 필요한 빈을 모아둔다.
 *
 * <p>슬라이스는 {@code @Configuration}·{@code @Component} 를 올리지 않아 {@code CommunityServiceBeansConfig} 가 import 하는
 * {@link QuerydslConfigurer} 도 빠진다. 그런데 {@code CommunityPostCustomRepositoryImpl} 은 {@code JPAQueryFactory} 를 생성자로 받는
 * 리포지터리 <b>프래그먼트</b>라 슬라이스에 자동으로 포함되므로, 이 빈이 없으면 게시글과 무관한 리포지터리 테스트까지 컨텍스트 로딩
 * 단계에서 전부 죽는다. 지금 이 서비스의 커스텀 구현이 생성자로 받는 빈은 {@code JPAQueryFactory} 하나뿐이다.
 *
 * <p>테스트마다 {@code @Import} 를 붙이지 않는다. 새 슬라이스 테스트를 추가할 때마다 같은 함정을 다시 밟기 때문이다. 대신
 * {@code META-INF/spring/org.springframework.boot.test.autoconfigure.orm.jpa.AutoConfigureDataJpa.imports} 에 이 클래스를 등록해
 * <b>모든</b> JPA 슬라이스에 자동으로 적용한다. 테스트 쪽은 {@link CommunityDataJpaTest} 하나만 붙인다(아래 프로필 격리를 함께 묶은 메타 애노테이션).
 * 자체 설정 클래스로 뜨는 {@code CommunityRepositoryMySqlConcurrencyTest} 에도 이 설정이 붙지만, 그쪽도 {@link QuerydslConfigurer} 를
 * import 하므로 같은 설정 클래스로 합쳐질 뿐 빈이 중복되지 않는다.
 *
 * <p><b>프로필 격리.</b> 슬라이스는 앱 클래스의 {@code @EnableFeignClients} 까지 올린다. 그래서 env 에 {@code SPRING_PROFILES_ACTIVE=dev} 만 있고
 * {@code DISTRICT_SERVICE_APP_NAME}·{@code AUTH_SERVICE_APP_NAME} 이 없으면 {@code application-dev.yml} 의 플레이스홀더가 풀리지 않아
 * Feign 클라이언트 등록에서 컨텍스트가 죽는다(Jenkins 는 Vault env 를 다 넣어 우연히 통과한다). env 가 없을 때 켜지는 기본 프로필
 * {@code local} 도 {@code ddl-auto: update}·SQL 바인딩 trace 로그 같은 로컬 개발용 JPA 설정을 슬라이스에 섞는다. imports 파일로는 프로필을 바꿀 수
 * 없어(환경 준비가 끝난 뒤 읽힌다) {@link CommunityDataJpaTest} 가 {@code @ActiveProfiles(PROFILE)} 를 묶어 env·기본 프로필을 가린다.
 * 이 프로필 이름의 설정 파일은 두지 않는다.
 * commercial-service 의 같은 이름 클래스와 같은 구조다.
 */
@TestConfiguration(proxyBeanMethods = false)
@Import(QuerydslConfigurer.class)
public class DataJpaSliceTestConfig {

    /** env 의 {@code SPRING_PROFILES_ACTIVE} 를 가리는 슬라이스 전용 프로필. 같은 이름의 {@code application-*.yml} 은 없다. */
    public static final String PROFILE = "slice-test";
}
