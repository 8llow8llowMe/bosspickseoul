package com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.controller;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request.CommunityCommentCreateRequest;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityCommentLikeResponse;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityCommentsResponse;
import com.followfollowme.nowdoboss.domainlayer.community.application.port.in.CommunityCommentWebUseCase;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/community/posts/{postId}/comments")
@Tag(name = "커뮤니티 댓글", description = "커뮤니티 댓글 조회, 작성, 삭제, 좋아요 API를 제공합니다.")
public class CommunityCommentWebController {

    private final CommunityCommentWebUseCase communityCommentWebUseCase;

    @Operation(summary = "댓글 목록 조회", description = "게시글의 댓글 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<Response<CommunityCommentsResponse>> getComments(
        @Parameter(description = "게시글 ID", example = "1") @PathVariable long postId
    ) {
        CommunityCommentsResponse response = communityCommentWebUseCase.getComments(postId);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "댓글 작성", description = "게시글에 댓글을 작성합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Response<CommunityCommentsResponse>> createComment(
        @AuthenticationPrincipal MemberLoginActive loginActive,
        @Parameter(description = "게시글 ID", example = "1") @PathVariable long postId,
        @Valid @RequestBody CommunityCommentCreateRequest request
    ) {
        CommunityCommentsResponse response = communityCommentWebUseCase.createComment(loginActive.memberId(), postId, request);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "댓글 삭제", description = "본인 댓글을 삭제합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    @DeleteMapping("/{commentId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Response<Void>> deleteComment(
        @AuthenticationPrincipal MemberLoginActive loginActive,
        @Parameter(description = "게시글 ID", example = "1") @PathVariable long postId,
        @Parameter(description = "댓글 ID", example = "1") @PathVariable long commentId
    ) {
        communityCommentWebUseCase.deleteComment(loginActive.memberId(), postId, commentId);
        return ResponseEntity.ok().body(Response.success());
    }

    @Operation(summary = "댓글 좋아요 토글", description = "댓글 좋아요를 등록하거나 취소합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    @PostMapping("/{commentId}/likes")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Response<CommunityCommentLikeResponse>> toggleCommentLike(
        @AuthenticationPrincipal MemberLoginActive loginActive,
        @Parameter(description = "게시글 ID", example = "1") @PathVariable long postId,
        @Parameter(description = "댓글 ID", example = "1") @PathVariable long commentId
    ) {
        CommunityCommentLikeResponse response = communityCommentWebUseCase.toggleCommentLike(loginActive.memberId(), postId, commentId);
        return ResponseEntity.ok().body(Response.success(response));
    }
}
