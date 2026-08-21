package com.followfollowme.bosspickseoul.domainlayer.community.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityPostLike;

public interface CommunityPostLikeRepositoryPort {

    boolean exists(long postId, long memberId);

    CommunityPostLike save(CommunityPostLike like);

    void delete(long postId, long memberId);
}
