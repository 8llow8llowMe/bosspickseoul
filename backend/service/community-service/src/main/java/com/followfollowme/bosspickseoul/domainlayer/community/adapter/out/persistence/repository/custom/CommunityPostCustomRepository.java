package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.repository.custom;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.entity.CommunityPostEntity;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityPostStatus;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunitySortType;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityTargetType;
import com.followfollowme.bosspickseoul.common.enums.OrderType;
import java.time.LocalDateTime;
import org.springframework.data.domain.Slice;

/**
 * 게시글 커서 목록 조회. {@code popularSince} 는 인기순(POPULAR)에서만 쓰는 작성 시각 하한이며 null 이면 하한을 두지 않는다(전체 기간).
 */
public interface CommunityPostCustomRepository {

    Slice<CommunityPostEntity> findBoardPostsNoOffset(
        CommunityTargetType targetType, String targetCode,
        CommunityPostStatus status, CommunitySortType sortType, OrderType orderType,
        long lastPostId, long lastLikeCount, int size,
        LocalDateTime popularSince
    );

    Slice<CommunityPostEntity> findFeedPostsNoOffset(
        CommunityPostStatus status, CommunitySortType sortType, OrderType orderType,
        CommunityTargetType targetType, String targetCode,
        long lastPostId, long lastLikeCount, int size,
        LocalDateTime popularSince
    );

    Slice<CommunityPostEntity> findLikedPostsNoOffset(
        long memberId,
        CommunityPostStatus status, CommunitySortType sortType, OrderType orderType,
        long lastPostId, long lastLikeCount, int size,
        LocalDateTime popularSince
    );

    Slice<CommunityPostEntity> findSearchPostsNoOffset(
        String keyword,
        CommunityPostStatus status, CommunitySortType sortType, OrderType orderType,
        long lastPostId, long lastLikeCount, int size,
        LocalDateTime popularSince
    );
}