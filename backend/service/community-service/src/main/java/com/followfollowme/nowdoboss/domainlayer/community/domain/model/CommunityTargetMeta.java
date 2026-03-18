package com.followfollowme.nowdoboss.domainlayer.community.domain.model;

import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityTargetType;

public record CommunityTargetMeta(
    CommunityTargetType targetType,
    String targetCode,
    String targetName
) {

}
