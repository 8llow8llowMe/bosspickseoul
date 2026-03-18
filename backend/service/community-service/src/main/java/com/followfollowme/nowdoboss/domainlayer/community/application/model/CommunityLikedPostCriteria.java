package com.followfollowme.nowdoboss.domainlayer.community.application.model;

import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunitySortType;
import com.followfollowme.nowdoboss.persistence.enums.OrderType;
import java.time.LocalDateTime;

public record CommunityLikedPostCriteria(

    long memberId,

    CommunitySortType sortType,

    OrderType orderType,

    long lastPostId,

    Long lastLikeCount,

    int size,

    LocalDateTime popularSince

) {

}