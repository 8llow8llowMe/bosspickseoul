package com.followfollowme.nowdoboss.apigateway.jwt;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AccessTokenBlacklistChecker {

    private static final String BLACKLIST_KEY_PREFIX = "blacklist:accessTokenId:";

    private final RedisTemplate<String, Object> redisTemplate;

    public boolean isBlacklisted(String tokenId) {
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(buildKey(tokenId)));
        } catch (RedisConnectionFailureException e) {
            log.error("[AccessTokenBlacklistChecker] Redis lookup failed: error={}", e.getMessage());
            return false;
        }
    }

    private String buildKey(String tokenId) {
        return BLACKLIST_KEY_PREFIX + tokenId;
    }
}
