package com.followfollowme.nowdoboss.domainlayer.auth.adapter.out.persistence;

import com.followfollowme.nowdoboss.domainlayer.auth.application.port.out.OAuthStateStorePort;
import com.followfollowme.nowdoboss.domainlayer.member.domain.enums.OAuthProvider;
import com.followfollowme.nowdoboss.redis.properties.RedisProperties;
import java.time.Duration;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RedisOAuthStateStoreAdapter implements OAuthStateStorePort {

    private final RedisTemplate<String, String> redisTemplate;
    private final RedisProperties redisProperties;

    @Override
    public void save(String state, OAuthProvider provider, Duration ttl) {
        redisTemplate.opsForValue().set(buildKey(state), provider.name(), ttl);
    }

    @Override
    public Optional<OAuthProvider> consume(String state) {
        // GETDEL로 조회와 삭제를 원자적으로 수행해 state 재사용을 차단한다.
        String providerName = redisTemplate.opsForValue().getAndDelete(buildKey(state));
        if (providerName == null) {
            return Optional.empty();
        }
        return Optional.of(OAuthProvider.valueOf(providerName));
    }

    private String buildKey(String state) {
        return redisProperties.normalizedKeyPrefix() + ":auth:oauthState:" + state;
    }
}
