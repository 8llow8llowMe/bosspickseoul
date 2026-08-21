package com.followfollowme.bosspickseoul.domainlayer.community.domain.model;

import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityTargetType;

public record CommunityTargetMeta(
    CommunityTargetType targetType,
    String targetCode,
    String targetName
) {

}
