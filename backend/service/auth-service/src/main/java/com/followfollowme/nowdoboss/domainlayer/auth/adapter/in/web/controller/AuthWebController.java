package com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.controller;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.dto.request.AuthEmailCodeSendRequest;
import com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.dto.request.AuthEmailCodeVerifyRequest;
import com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.dto.request.AuthGeneralLoginRequest;
import com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.dto.response.AuthGeneralLoginResponse;
import com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.dto.response.TokenReissueResponse;
import com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.provider.RefreshCookieProvider;
import com.followfollowme.nowdoboss.domainlayer.auth.application.command.AuthGeneralLoginCommand;
import com.followfollowme.nowdoboss.domainlayer.auth.application.command.TokenReissueCommand;
import com.followfollowme.nowdoboss.domainlayer.auth.application.info.AuthCookieResult;
import com.followfollowme.nowdoboss.domainlayer.auth.application.port.in.AuthWebUseCase;
import com.followfollowme.nowdoboss.security.common.dto.MemberLoginActive;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
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
@Tag(name = "인증/인가", description = "로그인, 로그아웃, 토큰 재발급 API를 제공합니다.")
public class AuthWebController {

    private static final String REFRESH_TOKEN_COOKIE = "refreshToken";

    private final AuthWebUseCase authWebUseCase;
    private final RefreshCookieProvider refreshCookieProvider;

    @Operation(summary = "일반 로그인", description = "이메일과 비밀번호로 로그인합니다.")
    @PostMapping("/login")
    public ResponseEntity<Response<AuthGeneralLoginResponse>> loginWithCredentials(@RequestBody AuthGeneralLoginRequest request) {
        AuthCookieResult<AuthGeneralLoginResponse> result = authWebUseCase.generalLogin(AuthGeneralLoginCommand.from(request));
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, refreshCookieProvider.createRefreshCookie(result.refreshToken()).toString())
            .body(Response.success(result.response()));
    }

    @Operation(
        summary = "로그아웃",
        description = "로그아웃하고 리프레시 토큰을 무효화합니다.",
        security = {@SecurityRequirement(name = "bearerAuth")}
    )
    @PostMapping("/logout")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Response<Void>> logout(@AuthenticationPrincipal MemberLoginActive loginActive) {
        authWebUseCase.logout(loginActive.memberId(), loginActive.tokenId());
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, refreshCookieProvider.clearRefreshCookie().toString())
            .body(Response.success());
    }

    @Operation(summary = "이메일 인증코드 발송", description = "회원가입용 이메일 인증코드를 발송합니다. 60초 쿨다운이 적용되며, 가입 여부와 무관하게 항상 성공으로 응답합니다(기가입 이메일에는 안내 메일 발송).")
    @PostMapping("/email/send-code")
    public ResponseEntity<Response<Void>> sendEmailVerificationCode(@Valid @RequestBody AuthEmailCodeSendRequest request) {
        authWebUseCase.sendEmailVerificationCode(request.email());
        return ResponseEntity.ok().body(Response.success());
    }

    @Operation(summary = "이메일 인증코드 검증", description = "메일로 받은 인증코드를 검증합니다. 성공하면 30분 동안 해당 이메일로 회원가입할 수 있습니다.")
    @PostMapping("/email/verify-code")
    public ResponseEntity<Response<Void>> verifyEmailVerificationCode(@Valid @RequestBody AuthEmailCodeVerifyRequest request) {
        authWebUseCase.verifyEmailVerificationCode(request.email(), request.code());
        return ResponseEntity.ok().body(Response.success());
    }

    @Operation(summary = "토큰 재발급", description = "리프레시 토큰으로 Access Token을 재발급합니다.")
    @PostMapping("/token/reissue")
    public ResponseEntity<Response<TokenReissueResponse>> reissueToken(
        @CookieValue(name = REFRESH_TOKEN_COOKIE, required = false) String refreshToken) {
        AuthCookieResult<TokenReissueResponse> result = authWebUseCase.reissueToken(TokenReissueCommand.from(refreshToken));
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, refreshCookieProvider.createRefreshCookie(result.refreshToken()).toString())
            .body(Response.success(result.response()));
    }
}
