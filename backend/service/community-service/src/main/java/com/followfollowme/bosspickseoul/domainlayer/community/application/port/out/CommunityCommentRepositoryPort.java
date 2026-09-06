package com.followfollowme.bosspickseoul.domainlayer.community.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityComment;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.OptionalLong;

public interface CommunityCommentRepositoryPort {

    List<CommunityComment> getComments(long postId);

    Optional<CommunityComment> findById(long commentId);

    /** in 절 벌킬 조회. 목록 화면에서 건당 단건 조회를 도는 N+1 을 막는다. */
    List<CommunityComment> findAllByIds(Collection<Long> commentIds);

    CommunityComment save(CommunityComment comment);

    boolean deleteIfActive(long commentId);

    OptionalLong incrementLikeCountIfActive(long commentId);

    OptionalLong decrementLikeCountIfActive(long commentId);
}
