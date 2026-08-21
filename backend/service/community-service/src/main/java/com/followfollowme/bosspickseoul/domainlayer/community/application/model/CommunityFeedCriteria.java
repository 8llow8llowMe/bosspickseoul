package com.followfollowme.bosspickseoul.domainlayer.community.application.model;

import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunitySortType;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityTargetType;
import com.followfollowme.bosspickseoul.common.enums.OrderType;
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