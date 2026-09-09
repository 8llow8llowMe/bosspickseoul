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
import java.time.Instant;
import java.util.Date;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

/**
 * 게이트웨이의 회원 단위 revocation 검사.
 *
 * <p>같은 비교식이 security-core 의 {@code JwtAuthFilter} 에도 있다 — 게이트웨이는 WebFlux 라
 * security-core(서블릿)에 의존할 수 없어 구현이 갈라진다. 두 쪽 판정이 어긋나면 리소스 서비스와
 * auth-service 의 무효화 시점이 달라지므로, 경계 규칙을 양쪽 모두에서 못 박는다.
 */
class MemberRevocationCheckerTest {

    private static final String MEMBER_ID = "42";
    private static final long REVOKED_AT = 1_757_000_000L;

    @Test
    @DisplayName("마커가 없으면 무효가 아니다")
    void noMarker_isNotRevoked() {
        MemberRevocationChecker checker = checker(null, false);

        assertThat(checker.isRevoked(MEMBER_ID, dateOf(REVOKED_AT))).isFalse();
    }

    @Test
    @DisplayName("revoke 이후 발급된 토큰은 통과한다")
    void issuedAfterRevoke_isNotRevoked() {
        MemberRevocationChecker checker = checker(String.valueOf(REVOKED_AT), false);

        assertThat(checker.isRevoked(MEMBER_ID, dateOf(REVOKED_AT + 1))).isFalse();
    }

    @Test
    @DisplayName("revoke 이전에 발급된 토큰은 거절한다")
    void issuedBeforeRevoke_isRevoked() {
        MemberRevocationChecker checker = checker(String.valueOf(REVOKED_AT), false);

        assertThat(checker.isRevoked(MEMBER_ID, dateOf(REVOKED_AT - 1))).isTrue();
    }

    @Test
    @DisplayName("iat 와 revokedAt 이 같은 초면 거절한다 (경계)")
    void issuedInTheSameSecondAsRevoke_isRevoked() {
        // security-core 의 JwtAuthFilter 와 같은 방향이어야 한다. 통과시키면 revoke 직전 발급 토큰이
        // access 만료까지 살아남는다.
        MemberRevocationChecker checker = checker(String.valueOf(REVOKED_AT), false);

        assertThat(checker.isRevoked(MEMBER_ID, dateOf(REVOKED_AT))).isTrue();
    }

    @Test
    @DisplayName("iat 클레임이 없는 토큰은 마커가 있으면 거절한다")
    void tokenWithoutIssuedAt_isRevokedWhenMarkerExists() {
        MemberRevocationChecker checker = checker(String.valueOf(REVOKED_AT), false);

        assertThat(checker.isRevoked(MEMBER_ID, null)).isTrue();
    }

    @Test
    @DisplayName("subject 가 없으면 키를 만들 수 없으므로 검사하지 않는다")
    void blankMemberId_skipsCheck() {
        MemberRevocationChecker checker = checker(String.valueOf(REVOKED_AT), false);

        assertThat(checker.isRevoked("", dateOf(REVOKED_AT - 1))).isFalse();
        assertThat(checker.isRevoked(null, dateOf(REVOKED_AT - 1))).isFalse();
    }

    @Test
    @DisplayName("Redis 장애: 기본은 fail-closed 로 503 을 던진다")
    void redisFailure_failsClosedByDefault() {
        MemberRevocationChecker checker = failingChecker(false);

        assertThatThrownBy(() -> checker.isRevoked(MEMBER_ID, dateOf(REVOKED_AT)))
            .isInstanceOf(JwtException.class)
            .extracting(t -> ((JwtException) t).getErrorCode())
            .isEqualTo(JwtErrorCode.TOKEN_VERIFICATION_UNAVAILABLE);
    }

    @Test
    @DisplayName("Redis 장애: fail-open 설정이면 통과시킨다")
    void redisFailure_passesWhenFailOpen() {
        MemberRevocationChecker checker = failingChecker(true);

        assertThat(checker.isRevoked(MEMBER_ID, dateOf(REVOKED_AT))).isFalse();
    }

    @Test
    @DisplayName("값이 손상돼 있으면 Redis 장애와 같은 정책으로 다룬다")
    void corruptedMarker_followsTheSameFailurePolicy() {
        assertThatThrownBy(() -> checker("not-a-number", false).isRevoked(MEMBER_ID, dateOf(REVOKED_AT)))
            .isInstanceOf(JwtException.class);

        assertThat(checker("not-a-number", true).isRevoked(MEMBER_ID, dateOf(REVOKED_AT))).isFalse();
    }

    private MemberRevocationChecker checker(String storedValue, boolean failOpen) {
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        @SuppressWarnings("unchecked")
        ValueOperations<String, String> valueOperations = mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(anyString())).thenReturn(storedValue);
        return new MemberRevocationChecker(redisTemplate, properties(failOpen), redisProperties());
    }

    private MemberRevocationChecker failingChecker(boolean failOpen) {
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        @SuppressWarnings("unchecked")
        ValueOperations<String, String> valueOperations = mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(anyString())).thenThrow(new RedisConnectionFailureException("down"));
        return new MemberRevocationChecker(redisTemplate, properties(failOpen), redisProperties());
    }

    private JwtVerificationProperties properties(boolean failOpen) {
        return new JwtVerificationProperties("test-access-key", failOpen);
    }

    /** record 라 목이 아니라 실물을 만든다. 이 테스트는 키 접두어 값 자체에는 관심이 없다. */
    private RedisProperties redisProperties() {
        return new RedisProperties(null, null, null, null, null, null, "test");
    }

    private Date dateOf(long epochSeconds) {
        return Date.from(Instant.ofEpochSecond(epochSeconds));
    }
}
