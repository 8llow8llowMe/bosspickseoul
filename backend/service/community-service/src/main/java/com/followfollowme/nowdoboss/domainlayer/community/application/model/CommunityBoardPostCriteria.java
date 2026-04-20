package com.followfollowme.nowdoboss.domainlayer.community.application.model;

import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunitySortType;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityTargetType;
import com.followfollowme.nowdoboss.common.enums.OrderType;
import java.time.LocalDateTime;

public record CommunityBoardPostCriteria(
    CommunityTargetType targetType,
    String targetCode,
    CommunitySortType sortType,
    OrderType orderType,
    long lastPostId,
    long lastLikeCount,
    int size,
    LocalDateTime popularSince
) {
}