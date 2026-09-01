package com.followfollowme.bosspickseoul.domainlayer.auth.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.JwtTokenStorePort;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.RefreshSessionMeta;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.query.RefreshSessionQueryResult;
import com.followfollowme.bosspickseoul.global.properties.AuthSessionProperties;
import com.followfollowme.bosspickseoul.redis.properties.RedisProperties;
import com.followfollowme.bosspickseoul.security.auth.blacklist.AccessTokenBlacklistVerifier;
import com.followfollowme.bosspickseoul.security.auth.jwt.JwtAuthProperties;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import com.followfollowme.bosspickseoul.security.common.exception.SecurityErrorCode;
import com.followfollowme.bosspickseoul.security.common.exception.SecurityJwtException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.stereotype.Component;

/**
 * 기기(세션)별 refresh 토큰 저장소.
 *
 * <ul>
 *   <li>{@code {prefix}:auth:refreshToken:{memberId}:{sessionId}} — 세션별 refresh 토큰, TTL = refresh 만료</li>
 *   <li>{@code {prefix}:auth:refreshSessionMeta:{memberId}:{sessionId}} — 세션 메타
 *       ({@code createdAtEpochMillis\n기기정보}), TTL = refresh 만료</li>
 *   <li>{@code {prefix}:auth:refreshSessions:{memberId}} — 세션 아이디 ZSET (score = 마지막 갱신 시각).
 *       상한 초과 시 가장 오래 갱신되지 않은 세션부터 밀어내는 인덱스</li>
 * </ul>
 *
 * <p>토큰 키가 TTL 로 먼저 사라져 인덱스에 세션 아이디만 남을 수 있지만, 조회는 항상 토큰 키
 * 기준이라 정합성 문제가 없고 잔여 항목은 목록 조회에서 걸러지며 밀어내기/전체 삭제 때 함께 정리된다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RedisJwtTokenStoreAdapter implements JwtTokenStorePort, AccessTokenBlacklistVerifier {

    private static final String BLACKLIST_VALUE = "logout";
    private static final String META_DELIMITER = "\n";

    private final RedisTemplate<String, String> redisTemplate;
    private final JwtAuthProperties jwtAuthProperties;
    private final RedisProperties redisProperties;
    private final AuthSessionProperties authSessionProperties;

    // 게이트웨이의 JWT_BLACKLIST_FAIL_OPEN 정책과 동일한 키로 정렬한다. (기본 fail-closed)
    @Value("${jwt.blacklist-fail-open:false}")
    private boolean blacklistFailOpen;

    @Override
    public void save(long memberId, String sessionId, String refreshToken, RefreshSessionMeta meta) {
        try {
            Duration ttl = jwtAuthProperties.refreshExpiration();
            redisTemplate.opsForValue().set(buildRefreshKey(memberId, sessionId), refreshToken, ttl);
            redisTemplate.opsForValue().set(buildMetaKey(memberId, sessionId), serializeMeta(meta), ttl);

            // 세션 인덱스 갱신 — score 를 현재 시각으로 올려 "가장 오래 갱신되지 않은" 순서를 유지한다.
            String sessionsKey = buildSessionsKey(memberId);
            redisTemplate.opsForZSet().add(sessionsKey, sessionId, System.currentTimeMillis());
            redisTemplate.expire(sessionsKey, ttl);

            evictOldestSessionsOverLimit(memberId, sessionsKey);
        } catch (RedisConnectionFailureException e) {
            log.error("[RedisJwtTokenStoreAdapter] RefreshToken 저장 실패: memberId={}, error={}",
                memberId, e.getMessage());
        }
    }

    @Override
    public Optional<String> find(long memberId, String sessionId) {
        try {
            String token = redisTemplate.opsForValue().get(buildRefreshKey(memberId, sessionId));
            return Optional.ofNullable(token);
        } catch (RedisConnectionFailureException e) {
            log.error("[RedisJwtTokenStoreAdapter] RefreshToken 조회 실패: memberId={}, error={}",
                memberId, e.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public Optional<RefreshSessionMeta> findSessionMeta(long memberId, String sessionId) {
        try {
            String raw = redisTemplate.opsForValue().get(buildMetaKey(memberId, sessionId));
            return Optional.ofNullable(raw).map(this::deserializeMeta);
        } catch (RedisConnectionFailureException e) {
            log.error("[RedisJwtTokenStoreAdapter] 세션 메타 조회 실패: memberId={}, error={}",
                memberId, e.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public List<RefreshSessionQueryResult> findAllSessions(long memberId) {
        Set<ZSetOperations.TypedTuple<String>> entries =
            redisTemplate.opsForZSet().reverseRangeWithScores(buildSessionsKey(memberId), 0, -1);
        if (entries == null) {
            return List.of();
        }

        List<RefreshSessionQueryResult> sessions = new ArrayList<>();
        for (ZSetOperations.TypedTuple<String> entry : entries) {
            String sessionId = entry.getValue();
            if (sessionId == null) {
                continue;
            }
            // 토큰 키가 TTL 로 사라진 잔여 인덱스는 목록에서 제외한다 (재발급 불가 = 세션 아님).
            if (!Boolean.TRUE.equals(redisTemplate.hasKey(buildRefreshKey(memberId, sessionId)))) {
                continue;
            }
            RefreshSessionMeta meta = findSessionMeta(memberId, sessionId).orElse(null);
            LocalDateTime lastUsedAt = entry.getScore() == null ? null : toLocalDateTime(entry.getScore().longValue());
            sessions.add(new RefreshSessionQueryResult(
                sessionId,
                meta == null ? null : meta.deviceInfo(),
                meta == null ? null : meta.createdAt(),
                lastUsedAt
            ));
        }
        return sessions;
    }

    /**
     * 세션 무효화의 핵심 연산이므로 Redis 실패를 삼키지 않고 전파한다.
     * 관용 처리가 필요한 호출부(로그아웃)는 상위에서 예외를 처리한다.
     */
    @Override
    public void deleteSession(long memberId, String sessionId) {
        redisTemplate.delete(buildRefreshKey(memberId, sessionId));
        redisTemplate.delete(buildMetaKey(memberId, sessionId));
        redisTemplate.opsForZSet().remove(buildSessionsKey(memberId), sessionId);
    }

    @Override
    public void deleteAllSessions(long memberId) {
        String sessionsKey = buildSessionsKey(memberId);
        Set<String> sessionIds = redisTemplate.opsForZSet().range(sessionsKey, 0, -1);
        if (sessionIds != null) {
            for (String sessionId : sessionIds) {
                redisTemplate.delete(buildRefreshKey(memberId, sessionId));
                redisTemplate.delete(buildMetaKey(memberId, sessionId));
            }
        }
        redisTemplate.delete(sessionsKey);
    }

    @Override
    public void saveAccessTokenIdBlacklist(String tokenId, Duration ttl) {
        redisTemplate.opsForValue().set(buildBlacklistKey(tokenId), BLACKLIST_VALUE, ttl);
    }

    @Override
    public boolean isRevoked(String tokenId) {
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(buildBlacklistKey(tokenId)));
        } catch (DataAccessException e) {
            log.error("[RedisJwtTokenStoreAdapter] AccessToken 블랙리스트 조회 실패: error={}", e.getMessage());
            if (blacklistFailOpen) {
                // fail-open: Redis 장애 시 인증 마비를 피하고 통과시킨다.
                return false;
            }
            // fail-closed(기본): 게이트웨이 정책과 동일하게 503으로 응답한다.
            throw new SecurityJwtException(SecurityErrorCode.TOKEN_VERIFICATION_UNAVAILABLE);
        }
    }

    private void evictOldestSessionsOverLimit(long memberId, String sessionsKey) {
        Long count = redisTemplate.opsForZSet().zCard(sessionsKey);
        long overflow = (count == null ? 0 : count) - authSessionProperties.maxDevices();
        if (overflow <= 0) {
            return;
        }
        Set<String> oldest = redisTemplate.opsForZSet().range(sessionsKey, 0, overflow - 1);
        if (oldest == null || oldest.isEmpty()) {
            return;
        }
        for (String sessionId : oldest) {
            redisTemplate.delete(buildRefreshKey(memberId, sessionId));
            redisTemplate.delete(buildMetaKey(memberId, sessionId));
        }
        redisTemplate.opsForZSet().remove(sessionsKey, oldest.toArray());
    }

    private String serializeMeta(RefreshSessionMeta meta) {
        long createdAtEpochMillis = meta.createdAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
        return createdAtEpochMillis + META_DELIMITER + (meta.deviceInfo() == null ? "" : meta.deviceInfo());
    }

    private RefreshSessionMeta deserializeMeta(String raw) {
        int delimiterIndex = raw.indexOf(META_DELIMITER);
        if (delimiterIndex < 0) {
            return new RefreshSessionMeta(raw, null);
        }
        LocalDateTime createdAt;
        try {
            createdAt = toLocalDateTime(Long.parseLong(raw.substring(0, delimiterIndex)));
        } catch (NumberFormatException e) {
            createdAt = null;
        }
        String deviceInfo = raw.substring(delimiterIndex + META_DELIMITER.length());
        return new RefreshSessionMeta(deviceInfo.isEmpty() ? null : deviceInfo, createdAt);
    }

    private LocalDateTime toLocalDateTime(long epochMillis) {
        return LocalDateTime.ofInstant(Instant.ofEpochMilli(epochMillis), ZoneId.systemDefault());
    }

    private String buildRefreshKey(long memberId, String sessionId) {
        return buildKey("auth", "refreshToken", memberId + ":" + sessionId);
    }

    private String buildMetaKey(long memberId, String sessionId) {
        return buildKey("auth", "refreshSessionMeta", memberId + ":" + sessionId);
    }

    private String buildSessionsKey(long memberId) {
        return buildKey("auth", "refreshSessions", String.valueOf(memberId));
    }

    private String buildBlacklistKey(String tokenId) {
        return buildKey("auth", "accessTokenBlacklist", tokenId);
    }

    private String buildKey(String domain, String type, String id) {
        return redisProperties.normalizedKeyPrefix() + ":" + domain + ":" + type + ":" + id;
    }
}
