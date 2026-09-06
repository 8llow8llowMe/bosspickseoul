package com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.query.RefreshSessionQueryResult;
import java.time.Duration;
import java.util.List;
import java.util.Optional;

public interface JwtTokenStorePort {

    /**
     * 기기(세션)별로 refresh 토큰과 세션 메타(기기 정보/최초 로그인 시각)를 저장한다.
     * sessionId 는 refresh 토큰의 jti 다. 회원당 세션 수가 상한을 넘으면
     * 가장 오래 갱신되지 않은 세션부터 밀어낸다.
     */
    void save(long memberId, String sessionId, String refreshToken, RefreshSessionMeta meta);

    /**
     * 현재 토큰 일치 확인과 새 세션 교체를 원자적으로 수행한다. 새 세션 아이디는 현재 아이디와 달라야 한다.
     * MISSING/TOKEN_MISMATCH이면 저장소를 변경하지 않으며, 성공 시 기존 메타(없으면 fallbackMeta)를 승계한다.
     */
    RefreshTokenRotationResult rotate(
        long memberId,
        String currentSessionId,
        String expectedRefreshToken,
        String newSessionId,
        String newRefreshToken,
        RefreshSessionMeta fallbackMeta
    );

    Optional<String> find(long memberId, String sessionId);

    /** 회전 시 이전 세션의 메타(최초 로그인 시각 등)를 이어받기 위한 조회. */
    Optional<RefreshSessionMeta> findSessionMeta(long memberId, String sessionId);

    /** 로그인 중인 기기 세션 목록 (마지막 사용 시각 내림차순). */
    List<RefreshSessionQueryResult> findAllSessions(long memberId);

    /** 특정 기기 세션만 무효화한다 (로그아웃). */
    void deleteSession(long memberId, String sessionId);

    /** 회원의 전 기기 세션을 무효화한다 (탈퇴/비밀번호 변경/상태 이상). */
    void deleteAllSessions(long memberId);

    void saveAccessTokenIdBlacklist(String tokenId, Duration ttl);
}
