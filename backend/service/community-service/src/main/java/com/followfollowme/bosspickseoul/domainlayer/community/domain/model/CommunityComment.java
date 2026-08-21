package com.followfollowme.bosspickseoul.domainlayer.community.domain.model;

import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityCommentStatus;
import java.time.LocalDateTime;

public record CommunityComment(
    long id,
    long postId,
    long memberId,
    Long parentCommentId,
    String content,
    CommunityCommentStatus status,
    long likeCount,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {

}
