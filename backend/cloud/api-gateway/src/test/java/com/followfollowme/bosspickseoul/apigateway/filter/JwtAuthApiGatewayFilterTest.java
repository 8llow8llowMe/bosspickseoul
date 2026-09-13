package com.followfollowme.bosspickseoul.apigateway.filter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.apigateway.jwt.AccessTokenBlacklistChecker;
import com.followfollowme.bosspickseoul.apigateway.jwt.JwtVerifier;
import com.followfollowme.bosspickseoul.apigateway.jwt.MemberRevocationChecker;
import com.followfollowme.bosspickseoul.apigateway.jwt.exception.JwtErrorCode;
import com.followfollowme.bosspickseoul.apigateway.jwt.exception.JwtException;
import com.followfollowme.bosspickseoul.apigateway.jwt.properties.JwtVerificationProperties;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.concurrent.atomic.AtomicReference;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * 게이트웨이 JWT 인증 경계.
 *
 * <p>이 필터가 전 시스템의 인증 관문이다. 하위 서비스는 게이트웨이가 붙여 준
 * {@code X-Authenticated-Member-Id} 를 그대로 믿으므로, 여기서 한 번 틀리면 리소스 서비스 전부가
 * 같이 틀린다. 그래서 "누가 통과하는가" 보다 <b>"클라이언트가 보낸 신원 헤더가 반드시 지워지는가"</b>
 * 를 먼저 못 박는다.
 *
 * <p>{@link JwtVerifier} 는 목이 아니라 실물을 쓴다. 서명·만료 판정은 jjwt 가 실제로 내려야
 * 오류 코드 매핑이 의미를 갖는다.
 */
class JwtAuthApiGatewayFilterTest {

    /** HS256 은 32바이트 미만 키를 거부한다. 테스트 전용 값이고 운영 키와 무관하다. */
    private static final String SECRET = "gateway-jwt-boundary-test-secret-key-0123456789";
    private static final SecretKey KEY = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));

    private static final String MEMBER_ID_HEADER = "X-Authenticated-Member-Id";
    private static final String LEGACY_MEMBER_ID_HEADER = "X-Member-Id";
    private static final String MEMBER_ID = "42";
    private static final String TOKEN_ID = "jti-1";

    @Test
    @DisplayName("토큰이 없어도 클라이언트가 보낸 신원 헤더는 지워진다")
    void withoutToken_clientSuppliedIdentityHeadersAreStripped() {
        // 이것이 이 필터의 존재 이유다. 지우지 않으면 누구나 헤더 한 줄로 타인을 사칭한다.
        ForwardedRequest forwarded = new ForwardedRequest();

        invoke(exchangeWith(MockServerHttpRequest.get("/api/v1/members/me")
            .header(MEMBER_ID_HEADER, "999")
            .header(LEGACY_MEMBER_ID_HEADER, "999")), forwarded);

        assertThat(forwarded.header(MEMBER_ID_HEADER)).isNull();
        assertThat(forwarded.header(LEGACY_MEMBER_ID_HEADER)).isNull();
    }

    @Test
    @DisplayName("유효한 토큰이 있어도 클라이언트가 보낸 신원 헤더가 덮어쓰지 못한다")
    void withValidToken_clientSuppliedIdentityHeaderCannotWin() {
        ForwardedRequest forwarded = new ForwardedRequest();

        invoke(exchangeWith(MockServerHttpRequest.get("/api/v1/members/me")
            .header(HttpHeaders.AUTHORIZATION, "Bearer " + validToken())
            .header(MEMBER_ID_HEADER, "999")), forwarded);

        assertThat(forwarded.header(MEMBER_ID_HEADER)).isEqualTo(MEMBER_ID);
    }

    @Test
    @DisplayName("Bearer 접두어가 없는 Authorization 은 토큰 없음으로 다루고 헤더는 그대로 지운다")
    void nonBearerAuthorization_isTreatedAsAnonymousButStillSanitized() {
        ForwardedRequest forwarded = new ForwardedRequest();

        invoke(exchangeWith(MockServerHttpRequest.get("/api/v1/members/me")
            .header(HttpHeaders.AUTHORIZATION, "Basic " + validToken())
            .header(MEMBER_ID_HEADER, "999")), forwarded);

        assertThat(forwarded.header(MEMBER_ID_HEADER)).isNull();
    }

    @Test
    @DisplayName("유효한 토큰은 subject 를 신원 헤더로 넘긴다")
    void validToken_propagatesSubjectAsIdentityHeader() {
        ForwardedRequest forwarded = new ForwardedRequest();

        invoke(authorized(validToken()), forwarded);

        assertThat(forwarded.header(MEMBER_ID_HEADER)).isEqualTo(MEMBER_ID);
    }

    @Test
    @DisplayName("subject 가 없는 토큰은 통과하되 신원 헤더를 붙이지 않는다")
    void tokenWithoutSubject_passesWithoutIdentityHeader() {
        ForwardedRequest forwarded = new ForwardedRequest();

        invoke(authorized(token(null, TOKEN_ID, Instant.now(), Instant.now().plusSeconds(600))), forwarded);

        assertThat(forwarded.header(MEMBER_ID_HEADER)).isNull();
    }

    @Test
    @DisplayName("만료된 토큰은 JWT_001 로 거절한다")
    void expiredToken_isRejectedAsExpired() {
        Instant past = Instant.now().minusSeconds(3600);

        assertThatThrownBy(() ->
            invoke(authorized(token(MEMBER_ID, TOKEN_ID, past, past.plusSeconds(60))), new ForwardedRequest()))
            .isInstanceOf(JwtException.class)
            .extracting(t -> ((JwtException) t).getErrorCode())
            .isEqualTo(JwtErrorCode.TOKEN_EXPIRED);
    }

    @Test
    @DisplayName("다른 키로 서명된 토큰은 JWT_003 으로 거절한다")
    void foreignlySignedToken_isRejectedAsSignatureInvalid() {
        SecretKey otherKey = Keys.hmacShaKeyFor(
            "a-completely-different-signing-key-0123456789".getBytes(StandardCharsets.UTF_8));
        String forged = Jwts.builder()
            .subject(MEMBER_ID)
            .expiration(Date.from(Instant.now().plusSeconds(600)))
            .signWith(otherKey)
            .compact();

        assertThatThrownBy(() -> invoke(authorized(forged), new ForwardedRequest()))
            .isInstanceOf(JwtException.class)
            .extracting(t -> ((JwtException) t).getErrorCode())
            .isEqualTo(JwtErrorCode.TOKEN_SIGNATURE_INVALID);
    }

    @Test
    @DisplayName("형식이 깨진 토큰은 JWT_004 로 거절한다")
    void malformedToken_isRejectedAsMalformed() {
        assertThatThrownBy(() -> invoke(authorized("not.a.jwt"), new ForwardedRequest()))
            .isInstanceOf(JwtException.class)
            .extracting(t -> ((JwtException) t).getErrorCode())
            .isEqualTo(JwtErrorCode.TOKEN_MALFORMED);
    }

    @Test
    @DisplayName("블랙리스트에 오른 jti 는 JWT_005 로 거절한다")
    void blacklistedTokenId_isRejectedAsRevoked() {
        AccessTokenBlacklistChecker blacklist = mock(AccessTokenBlacklistChecker.class);
        when(blacklist.isBlacklisted(TOKEN_ID)).thenReturn(true);

        assertThatThrownBy(() ->
            invoke(authorized(validToken()), new ForwardedRequest(), blacklist, allowingRevocationChecker()))
            .isInstanceOf(JwtException.class)
            .extracting(t -> ((JwtException) t).getErrorCode())
            .isEqualTo(JwtErrorCode.TOKEN_REVOKED);
    }

    @Test
    @DisplayName("회원 단위로 무효화된 토큰은 jti 가 깨끗해도 JWT_005 로 거절한다")
    void memberRevokedToken_isRejectedEvenWhenTokenIdIsClean() {
        // 비밀번호 변경·탈퇴 뒤 다른 기기의 access 를 막는 경로다. jti 블랙리스트만으로는 못 막는다.
        MemberRevocationChecker revocation = mock(MemberRevocationChecker.class);
        when(revocation.isRevoked(anyString(), any())).thenReturn(true);

        assertThatThrownBy(() ->
            invoke(authorized(validToken()), new ForwardedRequest(), allowingBlacklist(), revocation))
            .isInstanceOf(JwtException.class)
            .extracting(t -> ((JwtException) t).getErrorCode())
            .isEqualTo(JwtErrorCode.TOKEN_REVOKED);
    }

    @Test
    @DisplayName("검증 불가(Redis 장애)는 인증 실패로 바뀌지 않고 JWT_006 그대로 올라간다")
    void verificationUnavailable_isNotDowngradedToAuthFailure() {
        // 503 이 401 로 바뀌면 장애 중에 클라이언트가 재로그인을 시도하게 되고 원인도 가려진다.
        AccessTokenBlacklistChecker blacklist = mock(AccessTokenBlacklistChecker.class);
        when(blacklist.isBlacklisted(anyString()))
            .thenThrow(new JwtException(JwtErrorCode.TOKEN_VERIFICATION_UNAVAILABLE));

        assertThatThrownBy(() ->
            invoke(authorized(validToken()), new ForwardedRequest(), blacklist, allowingRevocationChecker()))
            .isInstanceOf(JwtException.class)
            .extracting(t -> ((JwtException) t).getErrorCode())
            .isEqualTo(JwtErrorCode.TOKEN_VERIFICATION_UNAVAILABLE);
    }

    // --- helpers ---

    private void invoke(ServerWebExchange exchange, ForwardedRequest forwarded) {
        invoke(exchange, forwarded, allowingBlacklist(), allowingRevocationChecker());
    }

    private void invoke(ServerWebExchange exchange, ForwardedRequest forwarded,
        AccessTokenBlacklistChecker blacklist, MemberRevocationChecker revocation) {
        new JwtAuthApiGatewayFilter(
            new JwtVerifier(new JwtVerificationProperties(SECRET, false)), blacklist, revocation)
            .apply(new JwtAuthApiGatewayFilter.Config())
            .filter(exchange, forwarded)
            .block();
    }

    private AccessTokenBlacklistChecker allowingBlacklist() {
        AccessTokenBlacklistChecker blacklist = mock(AccessTokenBlacklistChecker.class);
        when(blacklist.isBlacklisted(anyString())).thenReturn(false);
        return blacklist;
    }

    private MemberRevocationChecker allowingRevocationChecker() {
        MemberRevocationChecker revocation = mock(MemberRevocationChecker.class);
        when(revocation.isRevoked(anyString(), any())).thenReturn(false);
        return revocation;
    }

    private ServerWebExchange authorized(String token) {
        return exchangeWith(MockServerHttpRequest.get("/api/v1/members/me")
            .header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
    }

    private ServerWebExchange exchangeWith(MockServerHttpRequest.BaseBuilder<?> builder) {
        return MockServerWebExchange.from(builder.build());
    }

    private String validToken() {
        return token(MEMBER_ID, TOKEN_ID, Instant.now(), Instant.now().plusSeconds(600));
    }

    private String token(String subject, String tokenId, Instant issuedAt, Instant expiration) {
        return Jwts.builder()
            .subject(subject)
            .id(tokenId)
            .issuedAt(Date.from(issuedAt))
            .expiration(Date.from(expiration))
            .signWith(KEY)
            .compact();
    }

    /** 다운스트림으로 실제로 넘어간 요청을 붙잡는다. 헤더 위생이 이 지점에서만 확인된다. */
    private static final class ForwardedRequest implements GatewayFilterChain {

        private final AtomicReference<ServerWebExchange> forwarded = new AtomicReference<>();

        @Override
        public Mono<Void> filter(ServerWebExchange exchange) {
            forwarded.set(exchange);
            return Mono.empty();
        }

        private String header(String name) {
            ServerWebExchange exchange = forwarded.get();
            assertThat(exchange).as("다운스트림으로 전달되지 않았다").isNotNull();
            return exchange.getRequest().getHeaders().getFirst(name);
        }
    }
}
