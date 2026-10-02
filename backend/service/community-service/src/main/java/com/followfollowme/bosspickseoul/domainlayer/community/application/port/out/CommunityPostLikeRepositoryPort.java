package com.followfollowme.bosspickseoul.domainlayer.community.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityPostLike;
import java.util.Collection;
import java.util.Set;

public interface CommunityPostLikeRepositoryPort {

    boolean exists(long postId, long memberId);

    /** {@code postIds} 중 회원이 좋아요한 게시글 아이디. 목록 한 쪽 분량을 1회로 조회하고, 비어 있으면 조회하지 않는다. */
    Set<Long> findLikedPostIds(long memberId, Collection<Long> postIds);

    CommunityPostLike save(CommunityPostLike like);

    boolean delete(long postId, long memberId);
}
