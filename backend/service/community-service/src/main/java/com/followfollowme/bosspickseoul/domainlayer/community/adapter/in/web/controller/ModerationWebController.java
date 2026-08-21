package com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.controller;

import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.request.ModerationDecisionRequest;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.ModerationDecisionResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.ModerationReportsResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.in.ModerationWebUseCase;
import com.followfollowme.bosspickseoul.security.common.dto.MemberLoginActive;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/moderation")
@Tag(name = "커뮤니티 모더레이션", description = "신고 처리 API (MANAGER 전용)")
public class ModerationWebController {

    private final ModerationWebUseCase moderationWebUseCase;

    @Operation(
        summary = "미처리 신고 목록 조회",
        description = "처리되지 않은 신고 목록을 조회합니다. MANAGER 권한 필요.",
        security = @SecurityRequirement(name = "bearerAuth")
    )
    @GetMapping("/reports")
    @PreAuthorize("hasAuthority('MANAGER')")
    public ResponseEntity<Response<ModerationReportsResponse>> getPendingReports() {
        ModerationReportsResponse response = moderationWebUseCase.getPendingReports();
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(
        summary = "신고 처리",
        description = "신고를 승인(APPROVE_AND_HIDE) 또는 기각(DISMISS)합니다. MANAGER 권한 필요.",
        security = @SecurityRequirement(name = "bearerAuth")
    )
    @PatchMapping("/reports/{reportId}")
    @PreAuthorize("hasAuthority('MANAGER')")
    public ResponseEntity<Response<ModerationDecisionResponse>> processReport(
        @AuthenticationPrincipal MemberLoginActive loginActive,
        @Parameter(description = "신고 ID") @PathVariable long reportId,
        @Valid @RequestBody ModerationDecisionRequest request
    ) {
        ModerationDecisionResponse response = moderationWebUseCase.processReport(loginActive.memberId(), reportId, request);
        return ResponseEntity.ok().body(Response.success(response));
    }
}
