package com.followfollowme.bosspickseoul.apigateway.jwt;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.apigateway.jwt.exception.JwtErrorCode;
import com.followfollowme.bosspickseoul.apigateway.jwt.exception.JwtException;
import com.followfollowme.bosspickseoul.apigateway.jwt.properties.JwtVerificationProperties;
import com.followfollowme.bosspickseoul.redis.properties.RedisProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.RedisTemplate;

/**
 * 로그아웃된 access token(jti) 차단.
 *
 * <p>{@link MemberRevocationChecker} 와 같은 {@code blacklistFailOpen} 스위치를 공유한다. 두 검사의
 * 장애 정책이 갈리면 Redis 가 죽었을 때 한쪽만 열려 차단이 반쪽이 되므로, 같은 케이스를 양쪽에서
 * 각각 못 박는다.
 */
class AccessTokenBlacklistCheckerTest {

    private static final String TOKEN_ID = "jti-1";

    @Test
    @DisplayName("블랙리스트 키가 있으면 차단 대상이다")
    void existingKey_isBlacklisted() {
        assertThat(checker(true, false).isBlacklisted(TOKEN_ID)).isTrue();
    }

    @Test
    @DisplayName("블랙리스트 키가 없으면 통과시킨다")
    void missingKey_isNotBlacklisted() {
        assertThat(checker(false, false).isBlacklisted(TOKEN_ID)).isFalse();
    }

    @Test
    @DisplayName("hasKey 가 null 을 돌려줘도 통과로 다룬다")
    void nullReply_isNotBlacklisted() {
        assertThat(checker(null, false).isBlacklisted(TOKEN_ID)).isFalse();
    }

    @Test
    @DisplayName("Redis 장애: 기본은 fail-closed 로 503 을 던진다")
    void redisFailure_failsClosedByDefault() {
        assertThatThrownBy(() -> failingChecker(false).isBlacklisted(TOKEN_ID))
            .isInstanceOf(JwtException.class)
            .extracting(t -> ((JwtException) t).getErrorCode())
            .isEqualTo(JwtErrorCode.TOKEN_VERIFICATION_UNAVAILABLE);
    }

    @Test
    @DisplayName("Redis 장애: fail-open 설정이면 통과시킨다")
    void redisFailure_passesWhenFailOpen() {
        // 가용성을 택한 의도적 스위치다. 켜면 로그아웃된 토큰이 만료까지 통한다는 뜻이므로
        // 기본값이 뒤집히지 않도록 여기서 고정한다.
        assertThat(failingChecker(true).isBlacklisted(TOKEN_ID)).isFalse();
    }

    private AccessTokenBlacklistChecker checker(Boolean hasKey, boolean failOpen) {
        @SuppressWarnings("unchecked")
        RedisTemplate<String, Object> redisTemplate = mock(RedisTemplate.class);
        when(redisTemplate.hasKey(anyString())).thenReturn(hasKey);
        return new AccessTokenBlacklistChecker(redisTemplate, properties(failOpen), redisProperties());
    }

    private AccessTokenBlacklistChecker failingChecker(boolean failOpen) {
        @SuppressWarnings("unchecked")
        RedisTemplate<String, Object> redisTemplate = mock(RedisTemplate.class);
        when(redisTemplate.hasKey(anyString())).thenThrow(new RedisConnectionFailureException("down"));
        return new AccessTokenBlacklistChecker(redisTemplate, properties(failOpen), redisProperties());
    }

    private JwtVerificationProperties properties(boolean failOpen) {
        return new JwtVerificationProperties("test-access-key", failOpen);
    }

    /** record 라 목이 아니라 실물을 만든다. 이 테스트는 키 접두어 값 자체에는 관심이 없다. */
    private RedisProperties redisProperties() {
        return new RedisProperties(null, null, null, null, null, null, "test");
    }
}
