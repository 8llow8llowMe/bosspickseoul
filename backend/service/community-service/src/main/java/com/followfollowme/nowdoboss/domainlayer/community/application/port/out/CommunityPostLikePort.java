package com.followfollowme.nowdoboss.domainlayer.community.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityPostLike;

public interface CommunityPostLikePort {

    boolean exists(long postId, long memberId);

    CommunityPostLike save(CommunityPostLike like);

    void delete(long postId, long memberId);
}
