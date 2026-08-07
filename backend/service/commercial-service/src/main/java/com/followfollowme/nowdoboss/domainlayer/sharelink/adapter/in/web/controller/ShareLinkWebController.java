package com.followfollowme.nowdoboss.domainlayer.sharelink.adapter.in.web.controller;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.sharelink.adapter.in.web.dto.request.ShareLinkCreateRequest;
import com.followfollowme.nowdoboss.domainlayer.sharelink.adapter.in.web.dto.response.ShareLinkCreateResponse;
import com.followfollowme.nowdoboss.domainlayer.sharelink.adapter.in.web.dto.response.ShareLinkResolveResponse;
import com.followfollowme.nowdoboss.domainlayer.sharelink.application.port.in.ShareLinkWebUseCase;
import com.followfollowme.nowdoboss.security.common.dto.MemberLoginActive;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/share-links")
@Tag(name = "공유 링크", description = "분석 화면 공유 링크 생성, 해석 API를 제공합니다.")
public class ShareLinkWebController {

    private final ShareLinkWebUseCase shareLinkWebUseCase;

    @Operation(
        summary = "공유 링크 생성",
        description = "분석 화면 상태(payload)로 단축 공유 코드를 발급합니다. "
            + "같은 화면 상태를 다시 공유하면 기존 코드의 만료 시각을 연장해 재사용합니다.",
        security = @SecurityRequirement(name = "bearerAuth")
    )
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Response<ShareLinkCreateResponse>> createShareLink(
        @AuthenticationPrincipal MemberLoginActive loginActive,
        @Valid @RequestBody ShareLinkCreateRequest request
    ) {
        ShareLinkCreateResponse response = shareLinkWebUseCase.createShareLink(loginActive.memberId(), request);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(
        summary = "공유 링크 해석",
        description = "공유 코드를 화면 타입과 payload로 해석합니다. "
            + "프론트엔드는 shareType으로 진입 URL 템플릿을 고르고 payload를 합쳐 최종 URL을 조립합니다. 인증 없이 호출할 수 있습니다."
    )
    @GetMapping("/{shareCode}")
    public ResponseEntity<Response<ShareLinkResolveResponse>> resolveShareLink(
        @Parameter(description = "단축 공유 코드", example = "a1B2c3D4") @PathVariable String shareCode
    ) {
        ShareLinkResolveResponse response = shareLinkWebUseCase.resolveShareLink(shareCode);
        return ResponseEntity.ok().body(Response.success(response));
    }
}
