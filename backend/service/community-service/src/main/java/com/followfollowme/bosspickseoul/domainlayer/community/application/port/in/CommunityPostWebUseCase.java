package com.followfollowme.bosspickseoul.domainlayer.community.application.port.in;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.request.CommunityPostCreateRequest;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.request.CommunityCommercialComparisonDraftRequest;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityCommercialComparisonDraftResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.request.CommunityPostUpdateRequest;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityLikedPostsResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityPostDetailResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityPostLikeResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityPostListResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunitySortType;
import com.followfollowme.bosspickseoul.common.enums.OrderType;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.CommunityPostImageUploadResponse;
import com.followfollowme.bosspickseoul.storage.model.FileUploadCommand;
import java.util.List;

/**
 * 게시글 웹 유스케이스.
 *
 * <p>공개 조회(목록·검색·상세)의 {@code viewerMemberId} 는 선택 인증 값이다. 토큰이 없으면 null 이고,
 * 이때 응답의 {@code liked} 는 null 이다. 로그인이면 조회자 본인의 좋아요 여부(true/false)를 채운다.
 */
public interface CommunityPostWebUseCase {

    CommunityPostListResponse getPosts(
        Long viewerMemberId,
        CommunitySortType sortType, OrderType orderType,
        String targetType, String targetCode,
        long lastPostId, long lastLikeCount, int size
    );

    CommunityPostDetailResponse createPost(long memberId, CommunityPostCreateRequest request);

    List<CommunityPostImageUploadResponse> uploadPostImages(long memberId, List<FileUploadCommand> commands);

    CommunityCommercialComparisonDraftResponse createCommercialComparisonDraft(CommunityCommercialComparisonDraftRequest request);

    CommunityPostDetailResponse getPost(Long viewerMemberId, long postId);

    CommunityPostDetailResponse updatePost(long memberId, long postId, CommunityPostUpdateRequest request);

    void deletePost(long memberId, long postId);

    CommunityPostLikeResponse togglePostLike(long memberId, long postId);

    CommunityLikedPostsResponse getLikedPosts(
        long memberId,
        CommunitySortType sortType, OrderType orderType,
        long lastPostId, long lastLikeCount, int size
    );

    CommunityPostListResponse searchPosts(
        Long viewerMemberId,
        String keyword,
        CommunitySortType sortType, OrderType orderType,
        long lastPostId, long lastLikeCount, int size
    );
}
