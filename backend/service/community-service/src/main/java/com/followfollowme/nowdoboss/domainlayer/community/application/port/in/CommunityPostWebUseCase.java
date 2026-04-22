package com.followfollowme.nowdoboss.domainlayer.community.application.port.in;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request.CommunityPostCreateRequest;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request.CommunityCommercialComparisonDraftRequest;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityCommercialComparisonDraftResponse;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request.CommunityPostUpdateRequest;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityLikedPostsResponse;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityPostDetailResponse;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityPostLikeResponse;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityPostListResponse;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunitySortType;
import com.followfollowme.nowdoboss.common.enums.OrderType;

public interface CommunityPostWebUseCase {

    CommunityPostListResponse getPosts(
        CommunitySortType sortType, OrderType orderType,
        String targetType, String targetCode,
        long lastPostId, long lastLikeCount, int size
    );

    CommunityPostDetailResponse createPost(long memberId, CommunityPostCreateRequest request);

    CommunityCommercialComparisonDraftResponse createCommercialComparisonDraft(CommunityCommercialComparisonDraftRequest request);

    CommunityPostDetailResponse getPost(long postId);

    CommunityPostDetailResponse updatePost(long memberId, long postId, CommunityPostUpdateRequest request);

    void deletePost(long memberId, long postId);

    CommunityPostLikeResponse togglePostLike(long memberId, long postId);

    CommunityLikedPostsResponse getLikedPosts(
        long memberId,
        CommunitySortType sortType, OrderType orderType,
        long lastPostId, long lastLikeCount, int size
    );
}
