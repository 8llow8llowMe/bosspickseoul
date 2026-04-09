package com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.controller;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request.CommunityPostCreateRequest;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request.CommunityPostUpdateRequest;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityLikedPostsResponse;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityPostDetailResponse;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityPostLikeResponse;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityPostListResponse;
import com.followfollowme.nowdoboss.domainlayer.community.application.port.in.CommunityPostWebUseCase;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunitySortType;
import com.followfollowme.nowdoboss.persistence.enums.OrderType;
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
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/community/posts")
@Tag(name = "커뮤니티 게시글", description = "커뮤니티 게시글 조회, 작성, 수정, 삭제, 좋아요 API를 제공합니다.")
public class CommunityPostWebController {

    private final CommunityPostWebUseCase communityPostWebUseCase;

    @Operation(summary = "게시글 목록 조회", description = "조건에 맞는 게시글 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<Response<CommunityPostListResponse>> getPosts(
        @Parameter(description = "정렬 기준") @RequestParam(defaultValue = "LATEST") CommunitySortType sortType,
        @Parameter(description = "정렬 방향") @RequestParam(defaultValue = "DESC") OrderType orderType,
        @Parameter(description = "대상 타입 필터") @RequestParam(required = false) String targetType,
        @Parameter(description = "대상 코드 필터") @RequestParam(required = false) String targetCode,
        @Parameter(description = "마지막 게시글 ID", example = "0") @RequestParam(defaultValue = "0") long lastPostId,
        @Parameter(description = "인기순 조회 시 마지막 좋아요 수 커서", example = "0") @RequestParam(defaultValue = "0") long lastLikeCount,
        @Parameter(description = "조회 개수", example = "20") @RequestParam(defaultValue = "20") int size
    ) {
        CommunityPostListResponse response = communityPostWebUseCase.getPosts(sortType, orderType, targetType, targetCode, lastPostId, lastLikeCount, size);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "게시글 작성", description = "새 게시글을 작성합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Response<CommunityPostDetailResponse>> createPost(
        @AuthenticationPrincipal MemberLoginActive loginActive,
        @Valid @RequestBody CommunityPostCreateRequest request
    ) {
        CommunityPostDetailResponse response = communityPostWebUseCase.createPost(loginActive.memberId(), request);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "게시글 상세 조회", description = "게시글 상세 정보를 조회합니다.")
    @GetMapping("/{postId}")
    public ResponseEntity<Response<CommunityPostDetailResponse>> getPost(@Parameter(description = "게시글 ID", example = "1") @PathVariable long postId) {
        CommunityPostDetailResponse response = communityPostWebUseCase.getPost(postId);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "게시글 수정", description = "본인 게시글을 수정합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    @PatchMapping("/{postId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Response<CommunityPostDetailResponse>> updatePost(
        @AuthenticationPrincipal MemberLoginActive loginActive,
        @Parameter(description = "게시글 ID", example = "1") @PathVariable long postId,
        @Valid @RequestBody CommunityPostUpdateRequest request
    ) {
        CommunityPostDetailResponse response = communityPostWebUseCase.updatePost(loginActive.memberId(), postId, request);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "게시글 삭제", description = "본인 게시글을 삭제합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    @DeleteMapping("/{postId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Response<Void>> deletePost(
        @AuthenticationPrincipal MemberLoginActive loginActive,
        @Parameter(description = "게시글 ID", example = "1") @PathVariable long postId
    ) {
        communityPostWebUseCase.deletePost(loginActive.memberId(), postId);
        return ResponseEntity.ok().body(Response.success());
    }

    @Operation(summary = "게시글 좋아요 토글", description = "게시글 좋아요를 등록하거나 취소합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    @PutMapping("/{postId}/like")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Response<CommunityPostLikeResponse>> togglePostLike(
        @AuthenticationPrincipal MemberLoginActive loginActive,
        @Parameter(description = "게시글 ID", example = "1") @PathVariable long postId
    ) {
        CommunityPostLikeResponse response = communityPostWebUseCase.togglePostLike(loginActive.memberId(), postId);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(summary = "좋아요한 게시글 목록 조회", description = "현재 사용자가 좋아요한 게시글 목록을 조회합니다.", security = @SecurityRequirement(name = "bearerAuth"))
    @GetMapping("/liked")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Response<CommunityLikedPostsResponse>> getLikedPosts(
        @AuthenticationPrincipal MemberLoginActive loginActive,
        @Parameter(description = "정렬 기준") @RequestParam(defaultValue = "LATEST") CommunitySortType sortType,
        @Parameter(description = "정렬 방향") @RequestParam(defaultValue = "DESC") OrderType orderType,
        @Parameter(description = "마지막 게시글 ID", example = "0") @RequestParam(defaultValue = "0") long lastPostId,
        @Parameter(description = "인기순 조회 시 마지막 좋아요 수 커서", example = "0") @RequestParam(defaultValue = "0") long lastLikeCount,
        @Parameter(description = "조회 개수", example = "20") @RequestParam(defaultValue = "20") int size
    ) {
        CommunityLikedPostsResponse response = communityPostWebUseCase.getLikedPosts(
            loginActive.memberId(),
            sortType,
            orderType,
            lastPostId,
            lastLikeCount,
            size
        );
        return ResponseEntity.ok().body(Response.success(response));
    }
}
