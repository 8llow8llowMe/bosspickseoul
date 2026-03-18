package com.followfollowme.nowdoboss.domainlayer.community.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityComment;
import java.util.List;
import java.util.Optional;

public interface CommunityCommentPort {

    List<CommunityComment> getComments(long postId);

    Optional<CommunityComment> findById(long commentId);

    CommunityComment save(CommunityComment comment);
}
