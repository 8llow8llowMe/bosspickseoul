package com.followfollowme.nowdoboss.apigateway.jwt;

import com.followfollowme.nowdoboss.apigateway.jwt.exception.JwtErrorCode;
import com.followfollowme.nowdoboss.apigateway.jwt.exception.JwtException;
import com.followfollowme.nowdoboss.apigateway.jwt.properties.JwtVerificationProperties;
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
    private final JwtVerificationProperties jwtVerificationProperties;

    public boolean isBlacklisted(String tokenId) {
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(buildKey(tokenId)));
        } catch (RedisConnectionFailureException e) {
            log.error("[AccessTokenBlacklistChecker] Redis 블랙리스트 조회 실패: error={}", e.getMessage());
            if (jwtVerificationProperties.blacklistFailOpen()) {
                return false;
            }
            throw new JwtException(JwtErrorCode.TOKEN_VERIFICATION_UNAVAILABLE);
        }
    }

    private String buildKey(String tokenId) {
        return BLACKLIST_KEY_PREFIX + tokenId;
    }
}