package com.followfollowme.nowdoboss.domainlayer.community.domain.model;

import java.time.LocalDateTime;

public record CommunityCommentLike(
    long id,
    long commentId,
    long memberId,
    LocalDateTime createdAt
) {
}
