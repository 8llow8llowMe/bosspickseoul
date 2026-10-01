package com.followfollowme.bosspickseoul.support;

/**
 * {@code @DataJpaTest} 를 env 의 {@code SPRING_PROFILES_ACTIVE} 와 격리하는 슬라이스 전용 프로필.
 *
 * <p>슬라이스는 앱 클래스의 {@code @EnableFeignClients} 까지 올린다. 그래서 env 에 {@code SPRING_PROFILES_ACTIVE=dev} 만 있고
 * {@code COMMERCIAL_SERVICE_APP_NAME} 이 없으면 {@code application-dev.yml} 의 {@code ${COMMERCIAL_SERVICE_APP_NAME}} 이 풀리지 않아
 * Feign 클라이언트 등록에서 컨텍스트가 죽는다(Jenkins 는 Vault env 를 다 넣어 우연히 통과한다). {@code @ActiveProfiles(SliceTestProfile.NAME)}
 * 로 env 프로필을 가려 {@code application.yml} 기본값만으로 뜨게 한다. 이 이름의 {@code application-*.yml} 은 두지 않는다.
 * commercial-service 의 {@code DataJpaSliceTestConfig.PROFILE} 과 같은 값이다.
 */
public final class SliceTestProfile {

    public static final String NAME = "slice-test";

    private SliceTestProfile() {
    }
}
