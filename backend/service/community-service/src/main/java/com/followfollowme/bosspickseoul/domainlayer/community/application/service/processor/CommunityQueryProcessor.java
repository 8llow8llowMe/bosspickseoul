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
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommunityQueryProcessor {

    private static final int POPULAR_LOOKBACK_DAYS = 7;

    private final CommunityPostRepositoryPort communityPostRepositoryPort;
    private final CommunityCommentRepositoryPort communityCommentRepositoryPort;
    private final CommunityTargetMetaRepositoryPort communityTargetMetaRepositoryPort;

    public CommunityTargetMeta getTargetMeta(String targetType, String targetCode) {
        CommunityTargetType parsedTargetType = CommunityTargetType.from(targetType);
        return communityTargetMetaRepositoryPort.findTargetMeta(parsedTargetType, targetCode)
            .orElseThrow(() -> new CommunityException(CommunityErrorCode.TARGET_NOT_FOUND));
    }

    public Slice<CommunityPost> getBoardPosts(
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
            LocalDateTime.now().minusDays(POPULAR_LOOKBACK_DAYS)
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

    public Slice<CommunityPost> getFeed(
        CommunitySortType sortType, OrderType orderType,
        String targetType, String targetCode,
        long lastPostId, long lastLikeCount, int size
    ) {
        CommunityTargetType normalizedTargetType = null;
        if (targetType != null && !targetType.isBlank()) {
            normalizedTargetType = CommunityTargetType.from(targetType);
        }

        if (normalizedTargetType != null && targetCode != null && !targetCode.isBlank()) {
            ensureTargetExists(normalizedTargetType, targetCode);
        }

        String resolvedTargetCode = normalizedTargetType != null ? targetCode : null;
        CommunityFeedCriteria criteria = new CommunityFeedCriteria(
            sortType,
            orderType,
            normalizedTargetType,
            resolvedTargetCode,
            lastPostId,
            lastLikeCount,
            size,
            LocalDateTime.now().minusDays(POPULAR_LOOKBACK_DAYS)
        );
        return communityPostRepositoryPort.getFeedPosts(criteria);
    }

    public Slice<LikedCommunityPost> getLikedPosts(
        long memberId,
        CommunitySortType sortType, OrderType orderType,
        long lastPostId, long lastLikeCount, int size
    ) {
        CommunityLikedPostCriteria criteria = new CommunityLikedPostCriteria(
            memberId,
            sortType,
            orderType,
            lastPostId,
            lastLikeCount,
            size,
            LocalDateTime.now().minusDays(POPULAR_LOOKBACK_DAYS)
        );
        return communityPostRepositoryPort.getLikedPosts(criteria);
    }

    public Slice<CommunityPost> searchPosts(
        String keyword,
        CommunitySortType sortType, OrderType orderType,
        long lastPostId, long lastLikeCount, int size
    ) {
        CommunitySearchPostCriteria criteria = new CommunitySearchPostCriteria(
            keyword,
            sortType,
            orderType,
            lastPostId,
            lastLikeCount,
            size,
            LocalDateTime.now().minusDays(POPULAR_LOOKBACK_DAYS)
        );
        return communityPostRepositoryPort.searchPosts(criteria);
    }

    private void ensureTargetExists(CommunityTargetType targetType, String targetCode) {
        communityTargetMetaRepositoryPort.findTargetMeta(targetType, targetCode)
            .orElseThrow(() -> new CommunityException(CommunityErrorCode.TARGET_NOT_FOUND));
    }
}