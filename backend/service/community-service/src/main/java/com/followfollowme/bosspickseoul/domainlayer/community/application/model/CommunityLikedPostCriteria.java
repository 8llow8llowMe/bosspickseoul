package com.followfollowme.bosspickseoul.domainlayer.community.application.model;

import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunitySortType;
import com.followfollowme.bosspickseoul.common.enums.OrderType;
import java.time.LocalDateTime;

public record CommunityLikedPostCriteria(
    long memberId,
    CommunitySortType sortType,
    OrderType orderType,
    long lastPostId,
    long lastLikeCount,
    int size,
    LocalDateTime popularSince
) {
}