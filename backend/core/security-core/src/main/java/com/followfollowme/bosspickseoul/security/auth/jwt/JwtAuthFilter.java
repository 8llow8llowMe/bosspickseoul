package com.followfollowme.bosspickseoul.security.auth.jwt;

import com.followfollowme.bosspickseoul.security.auth.blacklist.AccessTokenBlacklistVerifier;
import com.followfollowme.bosspickseoul.security.auth.blacklist.MemberRevocationVerifier;
import com.followfollowme.bosspickseoul.security.common.dto.MemberLoginActive;
import com.followfollowme.bosspickseoul.security.common.exception.SecurityErrorCode;
import com.followfollowme.bosspickseoul.security.common.exception.SecurityJwtException;
import com.followfollowme.bosspickseoul.security.common.handler.AuthenticationFailureHandler;
import com.followfollowme.bosspickseoul.security.common.jwt.JwtAuthentication;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Slf4j
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";
    private final JwtAuthProvider jwtAuthProvider;
    private final AuthenticationFailureHandler failureHandler;
    // 구현 빈이 없으면 null — 블랙리스트 검증 없이 기존 동작을 유지한다.
    private final AccessTokenBlacklistVerifier blacklistVerifier;
    // 구현 빈이 없으면 null — 회원 단위 revocation 검사 없이 기존 동작을 유지한다.
    private final MemberRevocationVerifier memberRevocationVerifier;

    @Override
    protected void doFilterInternal(
        HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {

        String accessToken = getJwtFrom(request);

        if (StringUtils.hasText(accessToken)) {
            try {
                MemberLoginActive member = jwtAuthProvider.parseAccessToken(accessToken);
                validateNotRevoked(member.tokenId());
                validateNotRevokedByMember(member);
                SecurityContextHolder.getContext()
                    .setAuthentication(createAuthenticationToken(member));
            } catch (SecurityJwtException e) {
                SecurityContextHolder.clearContext();

                if (failureHandler.handleAuthenticationFailure(request, response, e)) {
                    return;
                }
            }
        }

        filterChain.doFilter(request, response);
    }

    private void validateNotRevoked(String tokenId) {
        if (blacklistVerifier == null) {
            return;
        }

        // jti가 없는 토큰은 revoke가 영구히 불가능하므로 fail-closed로 거부한다. (정상 발급 토큰은 항상 jti 포함)
        if (!StringUtils.hasText(tokenId)) {
            throw new SecurityJwtException(SecurityErrorCode.TOKEN_INVALID);
        }

        if (blacklistVerifier.isRevoked(tokenId)) {
            throw new SecurityJwtException(SecurityErrorCode.TOKEN_REVOKED);
        }
    }

    /**
     * 회원 단위 revocation 마커 검사. 비밀번호 변경/제거/탈퇴로 전 기기 세션이 끊긴 뒤에도
     * 다른 기기의 access 가 만료까지 살아 있던 구멍을 막는다.
     *
     * <p><b>iat == revokedAt 은 무효로 본다.</b> iat 가 초 단위라 같은 초에 발급된 토큰이
     * revoke 보다 앞선 것인지 뒤선 것인지 구분할 수 없다. 통과시키면 revoke 직전에 발급된 토큰이
     * access 만료까지 살아남아 이 기능이 막으려던 바로 그 구멍이 남고, 거절하면 revoke 와 같은 초에
     * 재로그인한 사용자가 한 번 더 로그인하면 된다. 안전한 쪽을 고른다.
     */
    private void validateNotRevokedByMember(MemberLoginActive member) {
        if (memberRevocationVerifier == null) {
            return;
        }

        long revokedAtEpochSeconds = memberRevocationVerifier.findRevokedAtEpochSeconds(member.memberId());
        if (revokedAtEpochSeconds <= 0) {
            return;
        }

        if (member.issuedAtEpochSeconds() <= revokedAtEpochSeconds) {
            throw new SecurityJwtException(SecurityErrorCode.TOKEN_REVOKED);
        }
    }

    private String getJwtFrom(HttpServletRequest request) {
        String bearerToken = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith(BEARER_PREFIX)) {
            return bearerToken.substring(BEARER_PREFIX.length());
        }

        return null;
    }

    private JwtAuthentication createAuthenticationToken(MemberLoginActive member) {
        return new JwtAuthentication(member, "",
            List.of(new SimpleGrantedAuthority(member.role().name())));
    }
}
