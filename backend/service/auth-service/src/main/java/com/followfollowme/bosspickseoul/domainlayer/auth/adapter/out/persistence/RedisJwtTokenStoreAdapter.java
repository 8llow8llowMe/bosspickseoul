package com.followfollowme.bosspickseoul.domainlayer.auth.adapter.out.persistence;

import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.JwtTokenStorePort;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.RefreshSessionMeta;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.RefreshTokenRotationResult;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.port.out.query.RefreshSessionQueryResult;
import com.followfollowme.bosspickseoul.global.properties.AuthSessionProperties;
import com.followfollowme.bosspickseoul.redis.properties.RedisProperties;
import com.followfollowme.bosspickseoul.security.auth.blacklist.AccessTokenBlacklistVerifier;
import com.followfollowme.bosspickseoul.security.auth.jwt.JwtAuthProperties;
import com.followfollowme.bosspickseoul.security.common.exception.SecurityErrorCode;
import com.followfollowme.bosspickseoul.security.common.exception.SecurityJwtException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataRetrievalFailureException;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.data.redis.core.script.DefaultRedisScript;
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
    private static final DefaultRedisScript<Long> DELETE_ALL_SESSIONS_SCRIPT = new DefaultRedisScript<>("""
        local sessions = redis.call('ZRANGE', KEYS[1], 0, -1)
        local tokenPrefix = cjson.decode(ARGV[1])
        local metaPrefix = cjson.decode(ARGV[2])
        for _, serializedSessionId in ipairs(sessions) do
            local sessionId = cjson.decode(serializedSessionId)
            redis.call('DEL', tokenPrefix .. sessionId, metaPrefix .. sessionId)
        end
        redis.call('DEL', KEYS[1])
        return #sessions
        """, Long.class);
    private static final DefaultRedisScript<Long> ROTATE_REFRESH_TOKEN_SCRIPT = new DefaultRedisScript<>("""
        local storedToken = redis.call('GET', KEYS[1])
        if not storedToken then
            return 0
        end
        if storedToken ~= ARGV[1] then
            return 1
        end

        local sessionMeta = redis.call('GET', KEYS[2])
        if not sessionMeta then
            sessionMeta = ARGV[4]
        end

        redis.call('SET', KEYS[3], ARGV[2], 'PX', ARGV[3])
        redis.call('SET', KEYS[4], sessionMeta, 'PX', ARGV[3])
        redis.call('ZADD', KEYS[5], ARGV[7], ARGV[6])
        redis.call('PEXPIRE', KEYS[5], ARGV[3])
        redis.call('DEL', KEYS[1], KEYS[2])
        redis.call('ZREM', KEYS[5], ARGV[5])
        return 2
        """, Long.class);

    private final RedisTemplate<String, String> redisTemplate;
    private final JwtAuthProperties jwtAuthProperties;
    private final RedisProperties redisProperties;
    private final AuthSessionProperties authSessionProperties;

    // 게이트웨이의 JWT_BLACKLIST_FAIL_OPEN 정책과 동일한 키로 정렬한다. (기본 fail-closed)
    @Value("${jwt.blacklist-fail-open:false}")
    private boolean blacklistFailOpen;

    @Override
    public void save(long memberId, String sessionId, String refreshToken, RefreshSessionMeta meta) {
        Duration ttl = jwtAuthProperties.refreshExpiration();
        redisTemplate.opsForValue().set(buildRefreshKey(memberId, sessionId), refreshToken, ttl);
        redisTemplate.opsForValue().set(buildMetaKey(memberId, sessionId), serializeMeta(meta), ttl);

        // 세션 인덱스 갱신 — score 를 현재 시각으로 올려 "가장 오래 갱신되지 않은" 순서를 유지한다.
        String sessionsKey = buildSessionsKey(memberId);
        redisTemplate.opsForZSet().add(sessionsKey, sessionId, System.currentTimeMillis());
        redisTemplate.expire(sessionsKey, ttl);

        evictOldestSessionsOverLimit(memberId, sessionsKey);
    }

    @Override
    public RefreshTokenRotationResult rotate(
        long memberId,
        String currentSessionId,
        String expectedRefreshToken,
        String newSessionId,
        String newRefreshToken,
        RefreshSessionMeta fallbackMeta
    ) {
        Duration ttl = jwtAuthProperties.refreshExpiration();
        Long result = redisTemplate.execute(
            ROTATE_REFRESH_TOKEN_SCRIPT,
            List.of(
                buildRefreshKey(memberId, currentSessionId),
                buildMetaKey(memberId, currentSessionId),
                buildRefreshKey(memberId, newSessionId),
                buildMetaKey(memberId, newSessionId),
                buildSessionsKey(memberId)
            ),
            expectedRefreshToken,
            newRefreshToken,
            ttl.toMillis(),
            serializeMeta(fallbackMeta),
            currentSessionId,
            newSessionId,
            System.currentTimeMillis()
        );
        if (result == null) {
            throw new DataRetrievalFailureException("Refresh token rotation returned no result");
        }
        return switch (result.intValue()) {
            case 0 -> RefreshTokenRotationResult.MISSING;
            case 1 -> RefreshTokenRotationResult.TOKEN_MISMATCH;
            case 2 -> RefreshTokenRotationResult.ROTATED;
            default -> throw new DataRetrievalFailureException("Unknown refresh token rotation result: " + result);
        };
    }

    @Override
    public Optional<String> find(long memberId, String sessionId) {
        String token = redisTemplate.opsForValue().get(buildRefreshKey(memberId, sessionId));
        return Optional.ofNullable(token);
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
        // 회전과 같은 원자 경계에서 인덱스를 읽고 삭제해야 새 세션이 살아남지 않는다.
        Long result = redisTemplate.execute(
            DELETE_ALL_SESSIONS_SCRIPT,
            List.of(buildSessionsKey(memberId)),
            buildRefreshKey(memberId, ""),
            buildMetaKey(memberId, "")
        );
        if (result == null) {
            throw new DataRetrievalFailureException("Session revocation returned no result");
        }
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
