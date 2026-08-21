package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.entity.CommunityCommentLikeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommunityCommentLikeRepository extends JpaRepository<CommunityCommentLikeEntity, Long> {

    boolean existsByCommentIdAndMemberId(long commentId, long memberId);

    void deleteByCommentIdAndMemberId(long commentId, long memberId);
}
