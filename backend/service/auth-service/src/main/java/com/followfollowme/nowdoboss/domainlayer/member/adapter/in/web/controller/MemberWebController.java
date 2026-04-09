package com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.controller;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.dto.request.MemberGeneralSignupRequest;
import com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.dto.response.MemberMyInfoResponse;
import com.followfollowme.nowdoboss.domainlayer.member.application.command.MemberGeneralSignupCommand;
import com.followfollowme.nowdoboss.domainlayer.member.application.port.in.MemberWebUseCase;
import com.followfollowme.nowdoboss.security.common.dto.MemberLoginActive;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/members")
@Tag(name = "회원", description = "회원 가입과 내 정보 조회 API를 제공합니다.")
public class MemberWebController {

    private final MemberWebUseCase memberWebUseCase;

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
}
