package com.followfollowme.nowdoboss.domainlayer.community.application.model;

import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunitySortType;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityTargetType;
import com.followfollowme.nowdoboss.persistence.enums.OrderType;
import java.time.LocalDateTime;

public record CommunityFeedCriteria(
    CommunitySortType sortType,
    OrderType orderType,
    CommunityTargetType targetType,
    String targetCode,
    long lastPostId,
    long lastLikeCount,
    int size,
    LocalDateTime popularSince
) {
}