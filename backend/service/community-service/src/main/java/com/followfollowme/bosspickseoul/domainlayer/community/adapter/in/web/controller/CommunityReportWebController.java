package com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.controller;

import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.request.CommunityReportCreateRequest;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.in.CommunityReportWebUseCase;
import com.followfollowme.bosspickseoul.security.common.dto.MemberLoginActive;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/community/reports")
@Tag(name = "커뮤니티 신고", description = "커뮤니티 게시글 및 댓글 신고 API를 제공합니다.")
public class CommunityReportWebController {

    private final CommunityReportWebUseCase communityReportWebUseCase;

    @Operation(summary = "신고 등록", description = "게시글이나 댓글을 신고합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Response<Void>> createReport(
        @AuthenticationPrincipal MemberLoginActive loginActive,
        @Valid @RequestBody CommunityReportCreateRequest request
    ) {
        communityReportWebUseCase.createReport(loginActive.memberId(), request);
        return ResponseEntity.ok().body(Response.success());
    }
}
