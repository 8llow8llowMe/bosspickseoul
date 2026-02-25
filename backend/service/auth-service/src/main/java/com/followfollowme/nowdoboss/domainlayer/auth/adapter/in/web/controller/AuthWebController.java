package com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.controller;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.dto.request.AuthGeneralLoginRequest;
import com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.dto.response.AuthGeneralLoginResponse;
import com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.dto.response.TokenReissueResponse;
import com.followfollowme.nowdoboss.domainlayer.auth.application.command.AuthGeneralLoginCommand;
import com.followfollowme.nowdoboss.domainlayer.auth.application.command.TokenReissueCommand;
import com.followfollowme.nowdoboss.domainlayer.auth.application.info.AuthCookieResult;
import com.followfollowme.nowdoboss.domainlayer.auth.application.port.in.AuthWebUseCase;
import com.followfollowme.nowdoboss.security.auth.jwt.JwtAuthProperties;
import com.followfollowme.nowdoboss.security.common.dto.MemberLoginActive;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/auth")
@Tag(name = "인증/인가", description = "인증/인가 관련 클라이언트에 제공하는 API 입니다.")
public class AuthWebController {

    private static final String REFRESH_TOKEN_COOKIE = "refreshToken";

    private final AuthWebUseCase authWebUseCase;
    private final JwtAuthProperties jwtAuthProperties;

    @Operation(
        summary = "일반 로그인",
        description = "이메일과 비밀번호를 입력하여 일반 로그인을 하는 기능입니다."
    )
    @PostMapping("/login")
    public ResponseEntity<Response<AuthGeneralLoginResponse>> loginWithCredentials(
        @RequestBody AuthGeneralLoginRequest request
    ) {
        AuthCookieResult<AuthGeneralLoginResponse> result = authWebUseCase.generalLogin(AuthGeneralLoginCommand.from(request));
        ResponseCookie refreshCookie = buildRefreshCookie(result.refreshToken(), jwtAuthProperties.refreshExpiration().getSeconds());
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
            .body(Response.success(result.response()));
    }

    @Operation(
        summary = "로그아웃",
        description = "로그인 한 회원을 로그아웃 하는 기능입니다.",
        security = {@SecurityRequirement(name = "bearerAuth")}
    )
    @PostMapping("/logout")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Response<Void>> logout(@AuthenticationPrincipal MemberLoginActive loginActive) {
        authWebUseCase.logout(loginActive.id());
        ResponseCookie clearCookie = buildRefreshCookie("", 0);
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, clearCookie.toString())
            .body(Response.success());
    }

    @Operation(
        summary = "토큰 재발급",
        description = "HttpOnly Cookie의 Refresh Token을 통해 Access Token과 새 Refresh Token을 재발급 받는 기능입니다."
    )
    @PostMapping("/token/reissue")
    public ResponseEntity<Response<TokenReissueResponse>> reissueToken(
        @CookieValue(name = REFRESH_TOKEN_COOKIE, required = false) String refreshToken
    ) {
        AuthCookieResult<TokenReissueResponse> result = authWebUseCase.reissueToken(TokenReissueCommand.from(refreshToken));
        ResponseCookie refreshCookie = buildRefreshCookie(result.refreshToken(), jwtAuthProperties.refreshExpiration().getSeconds());
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
            .body(Response.success(result.response()));
    }

    private ResponseCookie buildRefreshCookie(String value, long maxAgeSeconds) {
        return ResponseCookie.from(REFRESH_TOKEN_COOKIE, value)
            .httpOnly(true)
            .secure(true)
            .sameSite("Strict")
            .path("/")
            .maxAge(maxAgeSeconds)
            .build();
    }
}
