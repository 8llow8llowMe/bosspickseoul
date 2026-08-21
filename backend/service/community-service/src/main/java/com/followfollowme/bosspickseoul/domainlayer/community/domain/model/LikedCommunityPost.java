package com.followfollowme.bosspickseoul.domainlayer.community.domain.model;

import java.time.LocalDateTime;

public record LikedCommunityPost(
    CommunityPost post,
    LocalDateTime likedAt
) {

}
