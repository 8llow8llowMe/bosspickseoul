package com.followfollowme.bosspickseoul.domainlayer.community.domain.model;

import java.time.LocalDateTime;

public record CommunityPostLike(
    long id,
    long postId,
    long memberId,
    LocalDateTime createdAt
) {
}
