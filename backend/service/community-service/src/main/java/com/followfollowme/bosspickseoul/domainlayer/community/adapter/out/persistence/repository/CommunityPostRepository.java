package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.entity.CommunityPostEntity;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.repository.custom.CommunityPostCustomRepository;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityPostStatus;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CommunityPostRepository extends JpaRepository<CommunityPostEntity, Long>, CommunityPostCustomRepository {

    /** 정리 배치용. 소프트 삭제 후 보존 기간이 지난 행을 끊어 읽는다. */
    List<CommunityPostEntity> findByStatusAndUpdatedAtBefore(
        CommunityPostStatus status, LocalDateTime threshold, Limit limit);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        update CommunityPostEntity p
           set p.title = :title, p.content = :content, p.updatedAt = :updatedAt
         where p.id = :postId and p.memberId = :memberId and p.status = :activeStatus
        """)
    int updateContentIfActive(
        @Param("postId") long postId,
        @Param("memberId") long memberId,
        @Param("title") String title,
        @Param("content") String content,
        @Param("updatedAt") LocalDateTime updatedAt,
        @Param("activeStatus") CommunityPostStatus activeStatus
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        update CommunityPostEntity p set p.status = :deletedStatus, p.updatedAt = CURRENT_TIMESTAMP
         where p.id = :postId and p.status = :activeStatus
        """)
    int deleteIfActive(
        @Param("postId") long postId,
        @Param("activeStatus") CommunityPostStatus activeStatus,
        @Param("deletedStatus") CommunityPostStatus deletedStatus
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update CommunityPostEntity p set p.viewCount = p.viewCount + 1 where p.id = :postId and p.status = :activeStatus")
    int incrementViewCountIfActive(
        @Param("postId") long postId, @Param("activeStatus") CommunityPostStatus activeStatus);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        update CommunityPostEntity p set p.likeCount = p.likeCount + 1, p.updatedAt = CURRENT_TIMESTAMP
         where p.id = :postId and p.status = :activeStatus
        """)
    int incrementLikeCountIfActive(
        @Param("postId") long postId, @Param("activeStatus") CommunityPostStatus activeStatus);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        update CommunityPostEntity p
           set p.likeCount = case when p.likeCount > 0 then p.likeCount - 1 else 0 end,
               p.updatedAt = CURRENT_TIMESTAMP
         where p.id = :postId and p.status = :activeStatus
        """)
    int decrementLikeCountIfActive(
        @Param("postId") long postId, @Param("activeStatus") CommunityPostStatus activeStatus);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        update CommunityPostEntity p set p.commentCount = p.commentCount + 1, p.updatedAt = CURRENT_TIMESTAMP
         where p.id = :postId and p.status = :activeStatus
        """)
    int incrementCommentCountIfActive(
        @Param("postId") long postId, @Param("activeStatus") CommunityPostStatus activeStatus);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        update CommunityPostEntity p
           set p.commentCount = case when p.commentCount > 0 then p.commentCount - 1 else 0 end,
               p.updatedAt = CURRENT_TIMESTAMP
         where p.id = :postId and p.status = :activeStatus
        """)
    int decrementCommentCountIfActive(
        @Param("postId") long postId, @Param("activeStatus") CommunityPostStatus activeStatus);

}
