package com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityException;
import com.followfollowme.bosspickseoul.domainlayer.community.application.model.CommunityBoardPostCriteria;
import com.followfollowme.bosspickseoul.domainlayer.community.application.model.CommunityFeedCriteria;
import com.followfollowme.bosspickseoul.domainlayer.community.application.model.CommunityLikedPostCriteria;
import com.followfollowme.bosspickseoul.domainlayer.community.application.model.CommunitySearchPostCriteria;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityCommentRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityPostRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityTargetMetaRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityCommentStatus;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityPopularPeriod;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityPostCategory;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityPostStatus;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunitySortType;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityTargetType;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityComment;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityPost;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityTargetMeta;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.LikedCommunityPost;
import com.followfollowme.bosspickseoul.common.enums.OrderType;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.query.SliceQueryResult;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommunityQueryProcessor {

    private final CommunityPostRepositoryPort communityPostRepositoryPort;
    private final CommunityCommentRepositoryPort communityCommentRepositoryPort;
    private final CommunityTargetMetaRepositoryPort communityTargetMetaRepositoryPort;

    public CommunityTargetMeta getTargetMeta(String targetType, String targetCode) {
        CommunityTargetType parsedTargetType = CommunityTargetType.from(targetType);
        return communityTargetMetaRepositoryPort.findTargetMeta(parsedTargetType, targetCode)
            .orElseThrow(() -> new CommunityException(CommunityErrorCode.TARGET_NOT_FOUND));
    }

    public SliceQueryResult<CommunityPost> getBoardPosts(
        String targetType, String targetCode,
        CommunitySortType sortType, OrderType orderType,
        long lastPostId, long lastLikeCount, int size
    ) {
        CommunityTargetType parsedTargetType = CommunityTargetType.from(targetType);
        ensureTargetExists(parsedTargetType, targetCode);

        CommunityBoardPostCriteria criteria = new CommunityBoardPostCriteria(
            parsedTargetType,
            targetCode,
            sortType,
            orderType,
            lastPostId,
            lastLikeCount,
            size,
            // 호출처가 없는 경로라 기간 파라미터를 받지 않고 기존 기본값(최근 7일)을 유지한다.
            CommunityPopularPeriod.WEEK.since(LocalDateTime.now())
        );
        return communityPostRepositoryPort.getBoardPosts(criteria);
    }

    public CommunityPost getPost(long postId) {
        CommunityPost post = communityPostRepositoryPort.findById(postId)
            .orElseThrow(() -> new CommunityException(CommunityErrorCode.POST_NOT_FOUND));

        if (post.status() != CommunityPostStatus.ACTIVE) {
            throw new CommunityException(CommunityErrorCode.POST_NOT_FOUND);
        }

        return post;
    }

    public List<CommunityComment> getComments(long postId) {
        getPost(postId);
        return communityCommentRepositoryPort.getComments(postId);
    }

    public CommunityComment getComment(long commentId) {
        CommunityComment comment = communityCommentRepositoryPort.findById(commentId)
            .orElseThrow(() -> new CommunityException(CommunityErrorCode.COMMENT_NOT_FOUND));

        if (comment.status() != CommunityCommentStatus.ACTIVE) {
            throw new CommunityException(CommunityErrorCode.COMMENT_NOT_FOUND);
        }

        return comment;
    }

    /**
     * 피드 목록. 대상(targetType·targetCode)·말머리(category) 필터는 각각 선택이며 함께 쓸 수 있다.
     * 말머리가 null/blank 면 필터 없음, 잘못된 값은 COMMUNITY_017 이다 — 이 메서드의 대상 실조회(원격 호출) 전에 거른다.
     */
    public SliceQueryResult<CommunityPost> getFeed(
        CommunitySortType sortType, OrderType orderType, CommunityPopularPeriod period,
        String targetType, String targetCode, String category,
        long lastPostId, long lastLikeCount, int size
    ) {
        CommunityTargetType normalizedTargetType = null;
        if (targetType != null && !targetType.isBlank()) {
            normalizedTargetType = CommunityTargetType.from(targetType);
        }
        CommunityPostCategory parsedCategory = CommunityPostCategory.fromNullable(category);

        if (normalizedTargetType != null && targetCode != null && !targetCode.isBlank()) {
            ensureTargetExists(normalizedTargetType, targetCode);
        }

        String resolvedTargetCode = normalizedTargetType != null ? targetCode : null;
        CommunityFeedCriteria criteria = new CommunityFeedCriteria(
            sortType,
            orderType,
            normalizedTargetType,
            resolvedTargetCode,
            parsedCategory,
            lastPostId,
            lastLikeCount,
            size,
            popularSince(period)
        );
        return communityPostRepositoryPort.getFeedPosts(criteria);
    }

    public SliceQueryResult<LikedCommunityPost> getLikedPosts(
        long memberId,
        CommunitySortType sortType, OrderType orderType, CommunityPopularPeriod period,
        long lastPostId, long lastLikeCount, int size
    ) {
        CommunityLikedPostCriteria criteria = new CommunityLikedPostCriteria(
            memberId,
            sortType,
            orderType,
            lastPostId,
            lastLikeCount,
            size,
            popularSince(period)
        );
        return communityPostRepositoryPort.getLikedPosts(criteria);
    }

    public SliceQueryResult<CommunityPost> searchPosts(
        String keyword,
        CommunitySortType sortType, OrderType orderType, CommunityPopularPeriod period,
        long lastPostId, long lastLikeCount, int size
    ) {
        CommunitySearchPostCriteria criteria = new CommunitySearchPostCriteria(
            keyword,
            sortType,
            orderType,
            lastPostId,
            lastLikeCount,
            size,
            popularSince(period)
        );
        return communityPostRepositoryPort.searchPosts(criteria);
    }

    /**
     * 인기순 작성 시각 하한. 요청마다 현재 시각 기준으로 다시 계산하는 롤링 기간이며 ALL 이면 null(하한 없음)이다.
     * 최신순(LATEST)에도 값은 넘어가지만 리포지터리가 인기순에서만 쓴다.
     */
    private LocalDateTime popularSince(CommunityPopularPeriod period) {
        return period.since(LocalDateTime.now());
    }

    private void ensureTargetExists(CommunityTargetType targetType, String targetCode) {
        communityTargetMetaRepositoryPort.findTargetMeta(targetType, targetCode)
            .orElseThrow(() -> new CommunityException(CommunityErrorCode.TARGET_NOT_FOUND));
    }
}