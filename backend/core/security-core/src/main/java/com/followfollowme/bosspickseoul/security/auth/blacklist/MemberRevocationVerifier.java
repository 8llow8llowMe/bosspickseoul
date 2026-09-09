package com.followfollowme.bosspickseoul.security.auth.blacklist;

/**
 * 회원 단위 revocation 마커를 조회하는 계약.
 *
 * <p>{@link AccessTokenBlacklistVerifier} 는 <b>토큰 하나</b>(jti)를 무효화한다. 그래서 비밀번호
 * 변경·제거·탈퇴처럼 "이 회원의 모든 기기를 끊어야 하는" 사건에서는 구멍이 남는다 — refresh 는
 * 전부 지워지지만 다른 기기가 이미 들고 있는 access token 은 만료까지 그대로 통한다.
 * 요청을 보낸 기기의 access 만 블랙리스트에 오르기 때문이다.
 *
 * <p>그 구멍을 회원 단위 워터마크로 메운다. 전 기기 세션 무효화 시점을 회원별로 기록해 두고,
 * 그보다 먼저 발급된 access token 은 jti 와 무관하게 거절한다. 토큰 수만큼 키를 만들지 않고
 * 회원당 키 하나로 끝나므로 저장 비용도 일정하다.
 *
 * <p>구현 빈이 없으면 검사를 건너뛰고 기존 동작을 유지한다 ({@link AccessTokenBlacklistVerifier}
 * 와 동일한 선택적 훅 방식).
 */
public interface MemberRevocationVerifier {

    /**
     * 이 회원의 전 기기 세션이 무효화된 시각(epoch seconds). 마커가 없으면 {@code 0} 을 반환한다.
     *
     * <p>마커의 TTL 은 access token 만료 시간이다. 그 시간이 지나면 어차피 모든 옛 토큰이
     * 자연 만료되므로 마커를 더 들고 있을 이유가 없다.
     */
    long findRevokedAtEpochSeconds(long memberId);
}
