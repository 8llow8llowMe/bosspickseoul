package com.followfollowme.nowdoboss.domainlayer.community.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityCommentLike;

public interface CommunityCommentLikePort {

    boolean exists(long commentId, long memberId);

    CommunityCommentLike save(CommunityCommentLike like);

    void delete(long commentId, long memberId);
}
