package com.followfollowme.nowdoboss.domainlayer.community.application.port.out;

public interface CommunityCommentLikePort {

    boolean existsCommentLike(long commentId, long memberId);

    void saveCommentLike(long commentId, long memberId);

    void deleteCommentLike(long commentId, long memberId);
}
