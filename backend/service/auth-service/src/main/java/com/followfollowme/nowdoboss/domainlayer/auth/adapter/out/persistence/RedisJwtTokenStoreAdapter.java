package com.followfollowme.nowdoboss.domainlayer.auth.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.auth.application.port.out.JwtTokenStorePort;
import com.followfollowme.nowdoboss.redis.properties.RedisProperties;
import com.followfollowme.nowdoboss.security.auth.jwt.JwtAuthProperties;
import java.time.Duration;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class RedisJwtTokenStoreAdapter implements JwtTokenStorePort {

    private static final String BLACKLIST_VALUE = "logout";

    private final RedisTemplate<String, String> redisTemplate;
    private final JwtAuthProperties jwtAuthProperties;
    private final RedisProperties redisProperties;

    @Override
    public void save(long memberId, String refreshToken) {
        try {
            redisTemplate.opsForValue().set(
                buildRefreshKey(memberId),
                refreshToken,
                jwtAuthProperties.refreshExpiration()
            );
        } catch (RedisConnectionFailureException e) {
            log.error("[RedisJwtTokenStoreAdapter] RefreshToken 저장 실패: memberId={}, error={}",
                memberId, e.getMessage());
        }
    }

    @Override
    public Optional<String> find(long memberId) {
        try {
            String token = redisTemplate.opsForValue().get(buildRefreshKey(memberId));
            return Optional.ofNullable(token);
        } catch (RedisConnectionFailureException e) {
            log.error("[RedisJwtTokenStoreAdapter] RefreshToken 조회 실패: memberId={}, error={}",
                memberId, e.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public void delete(long memberId) {
        try {
            redisTemplate.delete(buildRefreshKey(memberId));
        } catch (RedisConnectionFailureException e) {
            log.error("[RedisJwtTokenStoreAdapter] RefreshToken 삭제 실패: memberId={}, error={}",
                memberId, e.getMessage());
        }
    }

    @Override
    public void saveAccessTokenIdBlacklist(String tokenId, Duration ttl) {
        try {
            redisTemplate.opsForValue().set(
                buildBlacklistKey(tokenId),
                BLACKLIST_VALUE,
                ttl
            );
        } catch (RedisConnectionFailureException e) {
            log.error("[RedisJwtTokenStoreAdapter] AccessToken 블랙리스트 저장 실패: error={}", e.getMessage());
        }
    }

    private String buildRefreshKey(long memberId) {
        return buildKey("auth", "refreshToken", String.valueOf(memberId));
    }

    private String buildBlacklistKey(String tokenId) {
        return buildKey("auth", "accessTokenBlacklist", tokenId);
    }

    private String buildKey(String domain, String type, String id) {
        return redisProperties.normalizedKeyPrefix() + ":" + domain + ":" + type + ":" + id;
    }
}
