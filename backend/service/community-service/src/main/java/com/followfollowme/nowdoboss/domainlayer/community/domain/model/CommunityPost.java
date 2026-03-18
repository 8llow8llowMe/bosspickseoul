package com.followfollowme.nowdoboss.domainlayer.community.domain.model;

import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityPostStatus;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityTargetType;
import java.time.LocalDateTime;

public record CommunityPost(
    long id,
    long memberId,
    CommunityTargetType targetType,
    String targetCode,
    String targetName,
    String title,
    String content,
    CommunityPostStatus status,
    long likeCount,
    long commentCount,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {

}
