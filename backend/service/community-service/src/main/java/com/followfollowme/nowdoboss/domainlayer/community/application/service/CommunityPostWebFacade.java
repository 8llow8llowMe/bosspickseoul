package com.followfollowme.nowdoboss.domainlayer.community.application.service;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request.CommunityCommercialComparisonDraftRequest;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request.CommunityPostCreateRequest;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request.CommunityPostUpdateRequest;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityCommercialComparisonDraftResponse;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityLikedPostsResponse;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityPostDetailResponse;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityPostLikeResponse;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.CommunityPostListResponse;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.presenter.CommunityPostPresenter;
import com.followfollowme.nowdoboss.domainlayer.community.application.command.CreatePostCommand;
import com.followfollowme.nowdoboss.domainlayer.community.application.command.UpdatePostCommand;
import com.followfollowme.nowdoboss.domainlayer.community.application.model.CommunityCommercialComparisonDraftInfo;
import com.followfollowme.nowdoboss.domainlayer.community.application.port.in.CommunityPostWebUseCase;
import com.followfollowme.nowdoboss.domainlayer.community.application.service.processor.CommunityCommandProcessor;
import com.followfollowme.nowdoboss.domainlayer.community.application.service.processor.CommunityQueryProcessor;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityAnalysisType;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunitySortType;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityPost;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityTargetMeta;
import com.followfollowme.nowdoboss.common.enums.OrderType;
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
    public CommunityPostListResponse getPosts(
        CommunitySortType sortType,
        OrderType orderType,
        String targetType,
        String targetCode,
        long lastPostId,
        long lastLikeCount,
        int size
    ) {
        CommunityTargetMeta targetMeta = null;
        if (targetType != null && !targetType.isBlank() && targetCode != null && !targetCode.isBlank()) {
            targetMeta = communityQueryProcessor.getTargetMeta(targetType, targetCode);
        }

        return communityPostPresenter.toPostListResponse(
            targetMeta,
            communityQueryProcessor.getFeed(sortType, orderType, targetType, targetCode, lastPostId, lastLikeCount, size)
        );
    }

    @Override
    public CommunityPostDetailResponse createPost(long memberId, CommunityPostCreateRequest request) {
        CreatePostCommand command = new CreatePostCommand(request.targetType(), request.targetCode(), request.title(), request.content());
        return communityPostPresenter.toPostDetailResponse(communityCommandProcessor.createPost(memberId, command));
    }

    @Override
    @Transactional(readOnly = true)
    public CommunityCommercialComparisonDraftResponse createCommercialComparisonDraft(CommunityCommercialComparisonDraftRequest request) {
        CommunityTargetMeta targetMeta = communityQueryProcessor.getTargetMeta(request.targetType(), request.targetCode());
        CommunityTargetMeta leftTarget = communityQueryProcessor.getTargetMeta("COMMERCIAL", request.leftCommercialCode());
        CommunityTargetMeta rightTarget = communityQueryProcessor.getTargetMeta("COMMERCIAL", request.rightCommercialCode());

        String analysisRefCode = "%s:%s:%s:%s".formatted(
            request.leftCommercialCode(),
            request.rightCommercialCode(),
            request.serviceCode(),
            request.periodCode()
        );
        String analysisRefName = "%s vs %s".formatted(leftTarget.targetName(), rightTarget.targetName());

        CommunityCommercialComparisonDraftInfo info = CommunityCommercialComparisonDraftInfo.builder()
            .targetType(targetMeta.targetType())
            .targetCode(targetMeta.targetCode())
            .targetName(targetMeta.targetName())
            .title("%s 비교 분석".formatted(analysisRefName))
            .content("""
                %s와 %s 상권을 비교해 보려 합니다.

                - 서비스 코드: %s
                - 기준 분기: %s
                - 실제 비교 포인트나 운영 경험이 있다면 이야기해 보면 좋겠습니다.
                """.formatted(leftTarget.targetName(), rightTarget.targetName(), request.serviceCode(), request.periodCode()).trim())
            .analysisType(CommunityAnalysisType.COMMERCIAL_COMPARISON)
            .analysisRefCode(analysisRefCode)
            .analysisRefName(analysisRefName)
            .analysisSnapshotKey("comparison-%s-%s-%s".formatted(
                request.leftCommercialCode(),
                request.rightCommercialCode(),
                request.periodCode()
            ))
            .build();

        return communityPostPresenter.toCommercialComparisonDraftResponse(info);
    }

    @Override
    @Transactional(readOnly = true)
    public CommunityPostDetailResponse getPost(long postId) {
        return communityPostPresenter.toPostDetailResponse(communityQueryProcessor.getPost(postId));
    }

    @Override
    public CommunityPostDetailResponse updatePost(long memberId, long postId, CommunityPostUpdateRequest request) {
        CommunityPost post = communityQueryProcessor.getPost(postId);
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
    public CommunityLikedPostsResponse getLikedPosts(
        long memberId,
        CommunitySortType sortType,
        OrderType orderType,
        long lastPostId,
        long lastLikeCount,
        int size
    ) {
        return communityPostPresenter.toLikedPostsResponse(
            communityQueryProcessor.getLikedPosts(memberId, sortType, orderType, lastPostId, lastLikeCount, size)
        );
    }
}
