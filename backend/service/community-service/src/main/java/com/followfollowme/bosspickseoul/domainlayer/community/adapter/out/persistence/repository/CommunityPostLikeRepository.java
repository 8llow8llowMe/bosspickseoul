package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.entity.CommunityPostLikeEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CommunityPostLikeRepository extends JpaRepository<CommunityPostLikeEntity, Long> {

    boolean existsByPostIdAndMemberId(long postId, long memberId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from CommunityPostLikeEntity l where l.postId = :postId and l.memberId = :memberId")
    int deleteByPostIdAndMemberId(@Param("postId") long postId, @Param("memberId") long memberId);
}
