package com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.provider;

import com.followfollowme.nowdoboss.security.auth.jwt.JwtAuthProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RefreshCookieProvider {

    private static final String REFRESH_TOKEN_COOKIE = "refreshToken";

    private final JwtAuthProperties jwtAuthProperties;

    public ResponseCookie createRefreshCookie(String refreshToken) {
        return ResponseCookie.from(REFRESH_TOKEN_COOKIE, refreshToken)
            .httpOnly(true)
            .secure(true)
            .sameSite("Strict")
            .path("/")
            .maxAge(jwtAuthProperties.refreshExpiration().getSeconds())
            .build();
    }

    public ResponseCookie clearRefreshCookie() {
        return ResponseCookie.from(REFRESH_TOKEN_COOKIE, "")
            .httpOnly(true)
            .secure(true)
            .sameSite("Strict")
            .path("/")
            .maxAge(0)
            .build();
    }
}
