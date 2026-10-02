package com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.controller;

import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.common.enums.OrderType;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.request.CommunityCommercialComparisonDraftRequest;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.request.CommunityPostCreateRequest;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.request.CommunityPostUpdateRequest;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityCommercialComparisonDraftResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityLikedPostsResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityPostDetailResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityPostLikeResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityPostListResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityPostImageUploadResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityValidationMessage;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.in.CommunityPostWebUseCase;
import com.followfollowme.bosspickseoul.storage.support.MultipartFileSupport;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunitySortType;
import com.followfollowme.bosspickseoul.security.common.dto.MemberLoginActive;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/community/posts")
@Tag(name = "커뮤니티 게시글", description = "커뮤니티 게시글 조회, 작성, 수정, 삭제, 좋아요 API를 제공합니다.")
public class CommunityPostWebController {

    private static final int MAX_POST_IMAGE_COUNT = 5;

    /** 공개 조회 3종(목록·검색·상세)의 선택 인증 안내. liked 만 토큰 유무로 달라진다. */
    private static final String OPTIONAL_AUTH_LIKED_DESCRIPTION =
        "인증은 선택입니다 — Bearer 토큰이 있으면 조회자 본인의 좋아요 여부(liked)를 true/false 로 채우고, 없으면 null 로 내립니다. "
            + "만료·위조 토큰을 보내면 공개 조회라도 401 이므로 비로그인 상태에서는 토큰을 보내지 않습니다.";

    private final CommunityPostWebUseCase communityPostWebUseCase;

    @Operation(
        summary = "게시글 목록 조회",
        description = "조건에 맞는 게시글 목록을 조회합니다. " + OPTIONAL_AUTH_LIKED_DESCRIPTION,
        security = @SecurityRequirement(name = "bearerAuth")
    )
    @GetMapping
    public ResponseEntity<Response<CommunityPostListResponse>> getPosts(
        @AuthenticationPrincipal MemberLoginActive loginActive,
        @Parameter(description = "정렬 기준") @RequestParam(defaultValue = "LATEST") CommunitySortType sortType,
        @Parameter(description = "정렬 방향") @RequestParam(defaultValue = "DESC") OrderType orderType,
        @Parameter(description = "대상 타입 필터") @RequestParam(required = false) String targetType,
        @Parameter(description = "대상 코드 필터") @RequestParam(required = false) String targetCode,
        @Parameter(description = "마지막 게시글 ID", example = "0") @RequestParam(defaultValue = "0") long lastPostId,
        @Parameter(description = "인기순 조회 시 마지막 좋아요 수 커서", example = "0") @RequestParam(defaultValue = "0") long lastLikeCount,
        @Parameter(description = "조회 개수 (1~50)", example = "20") @RequestParam(defaultValue = "20")
        @Min(value = 1, message = CommunityValidationMessage.PAGE_SIZE_INVALID)
        @Max(value = 50, message = CommunityValidationMessage.PAGE_SIZE_INVALID) int size
    ) {
        CommunityPostListResponse response = communityPostWebUseCase.getPosts(
            viewerMemberId(loginActive),
            sortType,
            orderType,
            targetType,
            targetCode,
            lastPostId,
            lastLikeCount,
            size
        );
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(
        summary = "게시글 검색",
        description = "제목 또는 본문에 키워드가 포함된 게시글을 검색합니다. " + OPTIONAL_AUTH_LIKED_DESCRIPTION,
        security = @SecurityRequirement(name = "bearerAuth")
    )
    @GetMapping("/search")
    public ResponseEntity<Response<CommunityPostListResponse>> searchPosts(
        @AuthenticationPrincipal MemberLoginActive loginActive,
        @Parameter(description = "검색 키워드") @RequestParam(required = false) String keyword,
        @Parameter(description = "정렬 기준") @RequestParam(defaultValue = "LATEST") CommunitySortType sortType,
        @Parameter(description = "정렬 방향") @RequestParam(defaultValue = "DESC") OrderType orderType,
        @Parameter(description = "마지막 게시글 ID", example = "0") @RequestParam(defaultValue = "0") long lastPostId,
        @Parameter(description = "인기순 조회 시 마지막 좋아요 수 커서", example = "0") @RequestParam(defaultValue = "0") long lastLikeCount,
        @Parameter(description = "조회 개수 (1~50)", example = "10") @RequestParam(defaultValue = "10")
        @Min(value = 1, message = CommunityValidationMessage.PAGE_SIZE_INVALID)
        @Max(value = 50, message = CommunityValidationMessage.PAGE_SIZE_INVALID) int size
    ) {
        CommunityPostListResponse response = communityPostWebUseCase.searchPosts(
            viewerMemberId(loginActive),
            keyword,
            sortType,
            orderType,
            lastPostId,
            lastLikeCount,
            size
        );
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(
        summary = "게시글 이미지 업로드",
        description = "게시글에 첨부할 이미지를 업로드하고 오브젝트 키를 발급받습니다. 최대 5장, jpg/png/gif/webp 만 허용합니다. "
            + "발급받은 imageKey 를 게시글 작성/수정 요청의 imageKeys 에 담아 보내면 게시글에 연결됩니다.",
        security = @SecurityRequirement(name = "bearerAuth")
    )
    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Response<List<CommunityPostImageUploadResponse>>> uploadPostImages(
        @AuthenticationPrincipal MemberLoginActive loginActive,
        @Parameter(description = "업로드할 이미지 파일 목록 (최대 5장)") @RequestPart("imageFiles") List<MultipartFile> imageFiles
    ) {
        List<CommunityPostImageUploadResponse> responses = communityPostWebUseCase.uploadPostImages(
            loginActive.memberId(), MultipartFileSupport.toCommands(imageFiles, MAX_POST_IMAGE_COUNT));
        return ResponseEntity.ok().body(Response.success(responses));
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

    @Operation(
        summary = "상권 비교 게시글 초안 생성",
        description = "상권 비교 결과를 바탕으로 커뮤니티 게시글 초안을 생성합니다."
    )
    @PostMapping("/drafts/commercial-comparisons")
    public ResponseEntity<Response<CommunityCommercialComparisonDraftResponse>> createCommercialComparisonDraft(
        @Valid @RequestBody CommunityCommercialComparisonDraftRequest request
    ) {
        CommunityCommercialComparisonDraftResponse response =
            communityPostWebUseCase.createCommercialComparisonDraft(request);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(
        summary = "게시글 상세 조회",
        description = "게시글 상세 정보를 조회합니다. 조회 시 조회수가 1 증가합니다. " + OPTIONAL_AUTH_LIKED_DESCRIPTION,
        security = @SecurityRequirement(name = "bearerAuth")
    )
    @GetMapping("/{postId}")
    public ResponseEntity<Response<CommunityPostDetailResponse>> getPost(
        @AuthenticationPrincipal MemberLoginActive loginActive,
        @Parameter(description = "게시글 ID", example = "1") @PathVariable long postId
    ) {
        CommunityPostDetailResponse response = communityPostWebUseCase.getPost(viewerMemberId(loginActive), postId);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(
        summary = "게시글 수정",
        description = "본인 게시글을 수정합니다.",
        security = @SecurityRequirement(name = "bearerAuth")
    )
    @PatchMapping("/{postId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Response<CommunityPostDetailResponse>> updatePost(
        @AuthenticationPrincipal MemberLoginActive loginActive,
        @Parameter(description = "게시글 ID", example = "1") @PathVariable long postId,
        @Valid @RequestBody CommunityPostUpdateRequest request
    ) {
        CommunityPostDetailResponse response = communityPostWebUseCase.updatePost(
            loginActive.memberId(),
            postId,
            request
        );
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(
        summary = "게시글 삭제",
        description = "본인 게시글을 삭제합니다. (소프트 삭제)",
        security = @SecurityRequirement(name = "bearerAuth")
    )
    @DeleteMapping("/{postId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Response<Void>> deletePost(
        @AuthenticationPrincipal MemberLoginActive loginActive,
        @Parameter(description = "게시글 ID", example = "1") @PathVariable long postId
    ) {
        communityPostWebUseCase.deletePost(loginActive.memberId(), postId);
        return ResponseEntity.ok().body(Response.success());
    }

    @Operation(
        summary = "게시글 좋아요 토글",
        description = "게시글 좋아요를 등록하거나 취소합니다.",
        security = @SecurityRequirement(name = "bearerAuth")
    )
    @PostMapping("/{postId}/likes")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Response<CommunityPostLikeResponse>> togglePostLike(
        @AuthenticationPrincipal MemberLoginActive loginActive,
        @Parameter(description = "게시글 ID", example = "1") @PathVariable long postId
    ) {
        CommunityPostLikeResponse response = communityPostWebUseCase.togglePostLike(loginActive.memberId(), postId);
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(
        summary = "좋아요한 게시글 목록 조회",
        description = "현재 사용자가 좋아요한 게시글 목록을 조회합니다.",
        security = @SecurityRequirement(name = "bearerAuth")
    )
    @GetMapping("/liked")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Response<CommunityLikedPostsResponse>> getLikedPosts(
        @AuthenticationPrincipal MemberLoginActive loginActive,
        @Parameter(description = "정렬 기준") @RequestParam(defaultValue = "LATEST") CommunitySortType sortType,
        @Parameter(description = "정렬 방향") @RequestParam(defaultValue = "DESC") OrderType orderType,
        @Parameter(description = "마지막 게시글 ID", example = "0") @RequestParam(defaultValue = "0") long lastPostId,
        @Parameter(description = "인기순 조회 시 마지막 좋아요 수 커서", example = "0") @RequestParam(defaultValue = "0") long lastLikeCount,
        @Parameter(description = "조회 개수 (1~50)", example = "20") @RequestParam(defaultValue = "20")
        @Min(value = 1, message = CommunityValidationMessage.PAGE_SIZE_INVALID)
        @Max(value = 50, message = CommunityValidationMessage.PAGE_SIZE_INVALID) int size
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

    /** 선택 인증 — 토큰이 없으면 principal 이 null 이고 조회자도 null(비로그인)이다. */
    private static Long viewerMemberId(MemberLoginActive loginActive) {
        return (loginActive != null) ? loginActive.memberId() : null;
    }
}
