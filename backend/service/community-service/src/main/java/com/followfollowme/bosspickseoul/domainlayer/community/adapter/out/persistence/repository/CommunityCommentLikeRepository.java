package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.entity.CommunityCommentLikeEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CommunityCommentLikeRepository extends JpaRepository<CommunityCommentLikeEntity, Long> {

    boolean existsByCommentIdAndMemberId(long commentId, long memberId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from CommunityCommentLikeEntity l where l.commentId = :commentId and l.memberId = :memberId")
    int deleteByCommentIdAndMemberId(@Param("commentId") long commentId, @Param("memberId") long memberId);
}
