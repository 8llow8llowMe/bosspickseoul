package com.followfollowme.nowdoboss.domainlayer.community.domain.model;

import java.time.LocalDateTime;

public record LikedCommunityPost(
    CommunityPost post,
    LocalDateTime likedAt
) {

}
