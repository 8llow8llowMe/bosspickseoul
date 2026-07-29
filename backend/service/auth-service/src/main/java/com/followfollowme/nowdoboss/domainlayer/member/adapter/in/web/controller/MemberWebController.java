package com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.controller;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.auth.adapter.in.web.provider.RefreshCookieProvider;
import com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.dto.request.MemberGeneralSignupRequest;
import com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.dto.request.MemberMyInfoUpdateRequest;
import com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.dto.request.MemberPasswordChangeRequest;
import com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.dto.response.MemberMyInfoResponse;
import com.followfollowme.nowdoboss.domainlayer.member.application.command.MemberGeneralSignupCommand;
import com.followfollowme.nowdoboss.domainlayer.member.application.port.in.MemberWebUseCase;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/members")
@Tag(name = "회원", description = "회원 가입, 내 정보 조회/수정, 비밀번호 변경, 탈퇴 API를 제공합니다.")
public class MemberWebController {

    private final MemberWebUseCase memberWebUseCase;
    private final RefreshCookieProvider refreshCookieProvider;

    @Operation(summary = "일반 회원가입", description = "일반 회원으로 가입합니다.")
    @PostMapping("/signup")
    public ResponseEntity<Response<Void>> generalSignup(@Valid @RequestBody MemberGeneralSignupRequest request) {
        memberWebUseCase.generalSignup(MemberGeneralSignupCommand.from(request));
        return ResponseEntity.ok().body(Response.success());
    }

    @Operation(
        summary = "내 회원 정보 조회",
        description = "로그인한 회원의 내 정보를 조회합니다.",
        security = {@SecurityRequirement(name = "bearerAuth")}
    )
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Response<MemberMyInfoResponse>> getMyInfo(@AuthenticationPrincipal MemberLoginActive loginActive) {
        MemberMyInfoResponse response = memberWebUseCase.getMyInfo(loginActive.memberId());
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(
        summary = "내 회원 정보 수정",
        description = "닉네임과 프로필 이미지 URL을 수정합니다. profileImageUrl을 생략하면 프로필 이미지가 제거됩니다.",
        security = {@SecurityRequirement(name = "bearerAuth")}
    )
    @PatchMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Response<MemberMyInfoResponse>> updateMyInfo(
        @AuthenticationPrincipal MemberLoginActive loginActive,
        @Valid @RequestBody MemberMyInfoUpdateRequest request
    ) {
        MemberMyInfoResponse response = memberWebUseCase.updateMyInfo(
            loginActive.memberId(), request.nickname(), request.profileImageUrl());
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(
        summary = "비밀번호 변경",
        description = "현재 비밀번호 확인 후 새 비밀번호로 변경합니다. 변경 후 재로그인이 필요하며, 모든 기기의 토큰 재발급이 차단됩니다. (다른 기기의 기존 access token은 만료 시까지 유효할 수 있습니다)",
        security = {@SecurityRequirement(name = "bearerAuth")}
    )
    @PostMapping("/me/password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Response<Void>> changePassword(
        @AuthenticationPrincipal MemberLoginActive loginActive,
        @Valid @RequestBody MemberPasswordChangeRequest request
    ) {
        memberWebUseCase.changePassword(
            loginActive.memberId(), loginActive.tokenId(), request.currentPassword(), request.newPassword());
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, refreshCookieProvider.clearRefreshCookie().toString())
            .body(Response.success());
    }

    @Operation(
        summary = "회원 탈퇴",
        description = "회원을 탈퇴 처리합니다. 개인정보가 마스킹되고 모든 기기의 토큰 재발급이 차단됩니다. 동일 이메일로 재가입할 수 없습니다. (다른 기기의 기존 access token은 만료 시까지 유효할 수 있으나, 회원 상태 검사로 회원 API 접근은 차단됩니다)",
        security = {@SecurityRequirement(name = "bearerAuth")}
    )
    @PostMapping("/me/withdraw")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Response<Void>> withdraw(@AuthenticationPrincipal MemberLoginActive loginActive) {
        memberWebUseCase.withdraw(loginActive.memberId(), loginActive.tokenId());
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, refreshCookieProvider.clearRefreshCookie().toString())
            .body(Response.success());
    }
}
