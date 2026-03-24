package com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.repository.custom;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.entity.CommunityPostEntity;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityPostStatus;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunitySortType;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityTargetType;
import com.followfollowme.nowdoboss.persistence.enums.OrderType;
import java.time.LocalDateTime;
import org.springframework.data.domain.Slice;

public interface CommunityPostCustomRepository {

    Slice<CommunityPostEntity> findBoardPostsNoOffset(
        CommunityTargetType targetType,
        String targetCode,
        CommunityPostStatus status,
        CommunitySortType sortType,
        OrderType orderType,
        long lastPostId,
        long lastLikeCount,
        int size,
        LocalDateTime popularSince
    );

    Slice<CommunityPostEntity> findFeedPostsNoOffset(
        CommunityPostStatus status,
        CommunitySortType sortType,
        OrderType orderType,
        CommunityTargetType targetType,
        String targetCode,
        long lastPostId,
        long lastLikeCount,
        int size,
        LocalDateTime popularSince
    );

    Slice<CommunityPostEntity> findLikedPostsNoOffset(
        long memberId,
        CommunityPostStatus status,
        CommunitySortType sortType,
        OrderType orderType,
        long lastPostId,
        long lastLikeCount,
        int size,
        LocalDateTime popularSince
    );
}