package com.followfollowme.nowdoboss.domainlayer.auth.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.auth.application.port.out.JwtTokenStorePort;
import com.followfollowme.nowdoboss.security.auth.jwt.JwtAuthProperties;
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

    private static final String KEY_PREFIX = "refreshToken:";
    private final RedisTemplate<String, String> redisTemplate;
    private final JwtAuthProperties jwtAuthProperties;

    @Override
    public void save(long memberId, String refreshToken) {
        try {
            redisTemplate.opsForValue().set(
                buildKey(memberId),
                refreshToken,
                jwtAuthProperties.refreshExpiration()
            );
        } catch (RedisConnectionFailureException e) {
            // 로그만 남기고 예외 안 던짐
            log.error("[RedisJwtTokenStoreAdapter] RefreshToken 저장 실패 (AccessToken은 발급됨) - 사용자는 나중에 재로그인 필요: memberId={}, error={}",
                memberId, e.getMessage());
        }
    }

    @Override
    public Optional<String> find(long memberId) {
        try {
            String token = redisTemplate.opsForValue().get(buildKey(memberId));
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
            redisTemplate.delete(buildKey(memberId));
        } catch (RedisConnectionFailureException e) {
            log.error("[RedisJwtTokenStoreAdapter] RefreshToken 삭제 실패 (무시): memberId={}", memberId);
        }
    }

    private String buildKey(long memberId) {
        return KEY_PREFIX + memberId;
    }
}
