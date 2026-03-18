package com.followfollowme.nowdoboss.domainlayer.community.application.service;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request.CommunityPostCreateRequest;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request.CommunityPostUpdateRequest;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityLikedPostsResponse;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityPostDetailResponse;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityPostLikeResponse;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityPostListResponse;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.presenter.CommunityPostPresenter;
import com.followfollowme.nowdoboss.domainlayer.community.application.command.CreatePostCommand;
import com.followfollowme.nowdoboss.domainlayer.community.application.command.UpdatePostCommand;
import com.followfollowme.nowdoboss.domainlayer.community.application.port.in.CommunityPostWebUseCase;
import com.followfollowme.nowdoboss.domainlayer.community.application.service.processor.CommunityCommandProcessor;
import com.followfollowme.nowdoboss.domainlayer.community.application.service.processor.CommunityQueryProcessor;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunitySortType;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityPost;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityTargetMeta;
import com.followfollowme.nowdoboss.persistence.enums.OrderType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CommunityPostWebFacade implements CommunityPostWebUseCase {

    private final CommunityQueryProcessor communityQueryProcessor;
    private final CommunityCommandProcessor communityCommandProcessor;
    private final CommunityPostPresenter communityPostPresenter;

    @Override
    @Transactional(readOnly = true)
    public CommunityPostListResponse getPosts(CommunitySortType sortType, OrderType orderType, String targetType, String targetCode, long lastPostId, Long lastLikeCount, int size) {
        // 1. ???硫뷀? 議고쉶 (targetType + targetCode 吏????
        CommunityTargetMeta targetMeta = null;
        if (targetType != null && !targetType.isBlank() && targetCode != null && !targetCode.isBlank()) {
            targetMeta = communityQueryProcessor.getTargetMeta(targetType, targetCode);
        }

        // 2. 寃뚯떆湲 紐⑸줉 議고쉶 (No-Offset)
        return communityPostPresenter.toPostListResponse(targetMeta, communityQueryProcessor.getFeed(sortType, orderType, targetType, targetCode, lastPostId, lastLikeCount, size));
    }

    @Override
    public CommunityPostDetailResponse createPost(long memberId, CommunityPostCreateRequest request) {
        // 1. Command 蹂??
        CreatePostCommand command = new CreatePostCommand(
            request.targetType(), request.targetCode(), request.title(), request.content()
        );

        // 2. 寃뚯떆湲 ?앹꽦 諛??묐떟 蹂??
        return communityPostPresenter.toPostDetailResponse(communityCommandProcessor.createPost(memberId, command));
    }

    @Override
    @Transactional(readOnly = true)
    public CommunityPostDetailResponse getPost(long postId) {
        return communityPostPresenter.toPostDetailResponse(communityQueryProcessor.getPost(postId));
    }

    @Override
    public CommunityPostDetailResponse updatePost(long memberId, long postId, CommunityPostUpdateRequest request) {
        // 1. 湲곗〈 寃뚯떆湲 議고쉶
        CommunityPost post = communityQueryProcessor.getPost(postId);

        // 2. 寃뚯떆湲 ?섏젙 諛??묐떟 蹂??
        UpdatePostCommand command = new UpdatePostCommand(request.title(), request.content());
        return communityPostPresenter.toPostDetailResponse(communityCommandProcessor.updatePost(memberId, post, command));
    }

    @Override
    public void deletePost(long memberId, long postId) {
        communityCommandProcessor.deletePost(memberId, communityQueryProcessor.getPost(postId));
    }

    @Override
    public CommunityPostLikeResponse togglePostLike(long memberId, long postId) {
        CommunityPost post = communityQueryProcessor.getPost(postId);
        long likeCount = communityCommandProcessor.togglePostLike(memberId, post);
        return communityPostPresenter.toPostLikeResponse(postId, likeCount > post.likeCount(), likeCount);
    }

    @Override
    @Transactional(readOnly = true)
    public CommunityLikedPostsResponse getLikedPosts(long memberId, CommunitySortType sortType, OrderType orderType, long lastPostId, Long lastLikeCount, int size) {
        return communityPostPresenter.toLikedPostsResponse(communityQueryProcessor.getLikedPosts(memberId, sortType, orderType, lastPostId, lastLikeCount, size));
    }
}
