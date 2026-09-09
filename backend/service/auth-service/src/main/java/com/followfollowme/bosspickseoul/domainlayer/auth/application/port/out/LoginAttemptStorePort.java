package com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out;

import java.time.Duration;

/**
 * 로그인 실패 횟수 / 잠금 상태 저장소 계약.
 *
 * <p>이메일 계열 메서드는 <b>이메일만</b>을 키로 받는다. 계정 존재 여부를 인자로 받지 않으므로
 * 미존재 이메일과 기가입 이메일이 저장소 관점에서 구분되지 않는다 (계정 열거 방지).
 *
 * <p>IP 계열 메서드는 이메일 잠금으로 못 막는 "한 IP 가 여러 이메일로 뿌리는" 공격을 위한
 * 별도 축이다. 잠금 플래그 없이 고정 윈도우 카운터 하나만 쓴다 — 윈도우가 끝나면 자연히 풀린다.
 */
public interface LoginAttemptStorePort {

    /**
     * 잠금 상태 여부. 저장소 장애 시에는 fail-open 으로 {@code false} 를 반환한다
     * (근거는 구현체 {@code RedisLoginAttemptStoreAdapter} 주석 참고).
     */
    boolean isLocked(String email);

    /**
     * 실패 카운터를 1 증가시키고 누적 실패 횟수를 반환한다. 저장소 장애 시에는 0 을 반환해
     * 호출부가 임계값 판정을 건너뛰게 한다.
     */
    long increaseFailureCount(String email, Duration ttl);

    /** 잠금을 설정한다. */
    void lock(String email, Duration lockDuration);

    /** 실패 카운터와 잠금을 모두 해제한다 (로그인 성공 시). */
    void clearFailures(String email);

    /**
     * 현재 윈도우에서 이 IP 가 쌓은 로그인 실패 횟수. 저장소 장애 시에는 fail-open 으로 0 을
     * 반환해 호출부가 상한 판정을 건너뛰게 한다.
     */
    long getIpFailureCount(String clientIp);

    /**
     * IP 실패 카운터를 1 증가시키고 누적 횟수를 반환한다. 첫 실패에서만 TTL 을 걸어 고정 윈도우로
     * 동작한다. 저장소 장애 시에는 0 을 반환한다.
     */
    long increaseIpFailureCount(String clientIp, Duration window);
}
