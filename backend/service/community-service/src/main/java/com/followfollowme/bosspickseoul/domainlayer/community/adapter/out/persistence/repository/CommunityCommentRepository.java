package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.entity.CommunityCommentEntity;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityCommentStatus;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CommunityCommentRepository extends JpaRepository<CommunityCommentEntity, Long> {

    /** 정리 배치용. 소프트 삭제 후 보존 기간이 지난 행을 끊어 읽는다. */
    List<CommunityCommentEntity> findByStatusAndUpdatedAtBefore(
        CommunityCommentStatus status, LocalDateTime threshold, Limit limit);

    List<CommunityCommentEntity> findByPostIdAndStatusOrderByCreatedAtAsc(long postId, CommunityCommentStatus status);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        update CommunityCommentEntity c set c.status = :deletedStatus, c.updatedAt = CURRENT_TIMESTAMP
         where c.id = :commentId and c.status = :activeStatus
        """)
    int deleteIfActive(
        @Param("commentId") long commentId,
        @Param("activeStatus") CommunityCommentStatus activeStatus,
        @Param("deletedStatus") CommunityCommentStatus deletedStatus
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        update CommunityCommentEntity c set c.likeCount = c.likeCount + 1, c.updatedAt = CURRENT_TIMESTAMP
         where c.id = :commentId and c.status = :activeStatus
        """)
    int incrementLikeCountIfActive(
        @Param("commentId") long commentId, @Param("activeStatus") CommunityCommentStatus activeStatus);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        update CommunityCommentEntity c
           set c.likeCount = case when c.likeCount > 0 then c.likeCount - 1 else 0 end,
               c.updatedAt = CURRENT_TIMESTAMP
         where c.id = :commentId and c.status = :activeStatus
        """)
    int decrementLikeCountIfActive(
        @Param("commentId") long commentId, @Param("activeStatus") CommunityCommentStatus activeStatus);
}
