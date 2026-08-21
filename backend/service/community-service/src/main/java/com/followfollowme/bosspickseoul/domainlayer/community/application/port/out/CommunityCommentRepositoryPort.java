package com.followfollowme.bosspickseoul.domainlayer.community.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityComment;
import java.util.List;
import java.util.Optional;

public interface CommunityCommentRepositoryPort {

    List<CommunityComment> getComments(long postId);

    Optional<CommunityComment> findById(long commentId);

    CommunityComment save(CommunityComment comment);
}
