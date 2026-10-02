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
    // 인기순(POPULAR) 작성 시각 하한. null 이면 하한 없음(CommunityPopularPeriod.ALL). 최신순에서는 쓰지 않는다.
    LocalDateTime popularSince
) {
}