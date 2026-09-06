package com.followfollowme.bosspickseoul.domainlayer.community.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityCommentLike;

public interface CommunityCommentLikeRepositoryPort {

    boolean exists(long commentId, long memberId);

    CommunityCommentLike save(CommunityCommentLike like);

    boolean delete(long commentId, long memberId);
}
