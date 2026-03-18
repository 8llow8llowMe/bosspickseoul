package com.followfollowme.nowdoboss.domainlayer.community.application.port.out;

public interface CommunityPostLikePort {

    boolean exists(long postId, long memberId);

    void save(long postId, long memberId);

    void delete(long postId, long memberId);
}
