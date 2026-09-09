package com.followfollowme.bosspickseoul.security.auth.jwt;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.security.auth.blacklist.AccessTokenBlacklistVerifier;
import com.followfollowme.bosspickseoul.security.auth.blacklist.MemberRevocationVerifier;
import com.followfollowme.bosspickseoul.security.common.enums.SecurityRole;
import com.followfollowme.bosspickseoul.security.common.exception.SecurityErrorCode;
import com.followfollowme.bosspickseoul.security.common.exception.SecurityJwtException;
import com.followfollowme.bosspickseoul.security.common.handler.AuthenticationFailureHandler;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * 회원 단위 revocation 마커 검사.
 *
 * <p>비밀번호 변경/제거/탈퇴로 전 기기 세션이 끊긴 뒤에도 다른 기기의 access token 은 만료까지
 * 통했다 — 요청을 보낸 기기의 jti 만 블랙리스트에 오르기 때문이다. 그 구멍을 회원별 워터마크로
 * 막는다.
 */
class JwtAuthFilterMemberRevocationTest {

    // HS512 는 512비트 이상 키를 요구한다.
    private static final String ACCESS_KEY = "test-access-secret-key-for-jwt-auth-filter-member-revocation-0123456789";
    private static final String REFRESH_KEY = "test-refresh-secret-key-for-jwt-auth-filter-member-revocation-0123456789";
    private static final long MEMBER_ID = 42L;

    private JwtAuthProvider jwtAuthProvider;
    private CapturingFailureHandler failureHandler;
    private StubMemberRevocationVerifier memberRevocationVerifier;
    private String accessToken;
    private long issuedAtEpochSeconds;

    @BeforeEach
    void setUp() {
        jwtAuthProvider = new JwtAuthProvider(new JwtAuthProperties(
            ACCESS_KEY, Duration.ofMinutes(30), REFRESH_KEY, Duration.ofDays(7)));
        failureHandler = new CapturingFailureHandler();
        memberRevocationVerifier = new StubMemberRevocationVerifier();

        accessToken = jwtAuthProvider.issueAccessToken(MEMBER_ID, SecurityRole.USER);
        // 발급 시각을 벽시계로 다시 재면 초 경계에서 어긋난다. 토큰이 실제로 들고 있는 iat 를 기준으로 삼는다.
        issuedAtEpochSeconds = jwtAuthProvider.parseAccessToken(accessToken).issuedAtEpochSeconds();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("마커가 없으면 기존대로 인증된다")
    void noMarker_authenticates() {
        memberRevocationVerifier.revokedAtByMemberId.clear();

        doFilter(filterWithRevocationVerifier());

        assertAuthenticated();
    }

    @Test
    @DisplayName("revoke 이후 발급된 토큰은 통과한다")
    void tokenIssuedAfterRevoke_authenticates() {
        memberRevocationVerifier.revokedAtByMemberId.put(MEMBER_ID, issuedAtEpochSeconds - 1);

        doFilter(filterWithRevocationVerifier());

        assertAuthenticated();
    }

    @Test
    @DisplayName("revoke 이전에 발급된 토큰은 jti 블랙리스트에 없어도 거절된다")
    void tokenIssuedBeforeRevoke_isRejected() {
        memberRevocationVerifier.revokedAtByMemberId.put(MEMBER_ID, issuedAtEpochSeconds + 1);

        doFilter(filterWithRevocationVerifier());

        assertRejectedAsRevoked();
    }

    @Test
    @DisplayName("iat 와 revokedAt 이 같은 초면 거절한다 (경계)")
    void tokenIssuedInTheSameSecondAsRevoke_isRejected() {
        // iat 는 초 단위라 같은 초 안에서는 발급이 revoke 보다 앞선 것인지 알 수 없다.
        // 통과시키면 revoke 직전 발급 토큰이 access 만료까지 살아남아 이 기능이 막으려던 구멍이 그대로 남는다.
        // 거절하면 같은 초에 재로그인한 사용자가 한 번 더 로그인하면 된다 — 안전한 쪽을 고정한다.
        memberRevocationVerifier.revokedAtByMemberId.put(MEMBER_ID, issuedAtEpochSeconds);

        doFilter(filterWithRevocationVerifier());

        assertRejectedAsRevoked();
    }

    @Test
    @DisplayName("다른 회원의 마커는 영향을 주지 않는다")
    void markerOfAnotherMember_doesNotAffectThisToken() {
        memberRevocationVerifier.revokedAtByMemberId.put(MEMBER_ID + 1, issuedAtEpochSeconds + 1);

        doFilter(filterWithRevocationVerifier());

        assertAuthenticated();
    }

    @Test
    @DisplayName("구현 빈이 없으면 검사를 건너뛰고 기존 동작을 유지한다")
    void withoutVerifierBean_keepsLegacyBehaviour() {
        doFilter(new JwtAuthFilter(jwtAuthProvider, failureHandler, null, null));

        assertAuthenticated();
    }

    private JwtAuthFilter filterWithRevocationVerifier() {
        AccessTokenBlacklistVerifier neverBlacklisted = tokenId -> false;
        return new JwtAuthFilter(jwtAuthProvider, failureHandler, neverBlacklisted, memberRevocationVerifier);
    }

    private void doFilter(JwtAuthFilter filter) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken);
        try {
            filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());
        } catch (ServletException | IOException e) {
            throw new IllegalStateException(e);
        }
    }

    private void assertAuthenticated() {
        assertThat(failureHandler.capturedErrorCode).isNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
    }

    private void assertRejectedAsRevoked() {
        assertThat(failureHandler.capturedErrorCode).isEqualTo(SecurityErrorCode.TOKEN_REVOKED);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    private static final class StubMemberRevocationVerifier implements MemberRevocationVerifier {

        private final java.util.Map<Long, Long> revokedAtByMemberId = new java.util.HashMap<>();

        @Override
        public long findRevokedAtEpochSeconds(long memberId) {
            return revokedAtByMemberId.getOrDefault(memberId, 0L);
        }
    }

    private static final class CapturingFailureHandler implements AuthenticationFailureHandler {

        private SecurityErrorCode capturedErrorCode;

        @Override
        public boolean handleAuthenticationFailure(
            HttpServletRequest request, HttpServletResponse response, Throwable exception) {
            if (exception instanceof SecurityJwtException jwtException) {
                capturedErrorCode = jwtException.getErrorCode();
            }
            return true;
        }

        @Override
        public boolean supports(Throwable exception) {
            return exception instanceof SecurityJwtException;
        }
    }
}
