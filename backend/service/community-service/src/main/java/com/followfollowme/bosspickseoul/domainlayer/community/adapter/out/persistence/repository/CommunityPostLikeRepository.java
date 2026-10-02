package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.entity.CommunityPostLikeEntity;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CommunityPostLikeRepository extends JpaRepository<CommunityPostLikeEntity, Long> {

    boolean existsByPostIdAndMemberId(long postId, long memberId);

    /**
     * 목록의 좋아요 여부 표시용. 엔티티 전체가 아니라 postId 만 꺼낸다.
     * 조건이 고정된 스칼라 프로젝션이라 정적 JPQL 을 쓴다 (coding-conventions §9-6).
     */
    @Query("select l.postId from CommunityPostLikeEntity l where l.memberId = :memberId and l.postId in :postIds")
    List<Long> findLikedPostIds(long memberId, Collection<Long> postIds);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from CommunityPostLikeEntity l where l.postId = :postId and l.memberId = :memberId")
    int deleteByPostIdAndMemberId(@Param("postId") long postId, @Param("memberId") long memberId);
}
