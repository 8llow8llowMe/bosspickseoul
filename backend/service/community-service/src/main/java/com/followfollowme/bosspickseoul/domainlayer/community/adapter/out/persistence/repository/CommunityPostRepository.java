package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.entity.CommunityPostEntity;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.repository.custom.CommunityPostCustomRepository;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityPostCategory;
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

    /**
     * 본문 수정. 수정 화면이 다루는 필드(제목·본문·말머리)만 바꾸고 카운터는 건드리지 않는다 — 동시 좋아요·조회를 덮어쓰지 않는다.
     * 말머리는 전체 교체라 null 이면 null 로 지운다. 파라미터명이 쿼리 이름과 같아 {@code @Param} 을 붙이지 않는다(coding-conventions §9-6).
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        update CommunityPostEntity p
           set p.title = :title, p.content = :content, p.category = :category, p.updatedAt = :updatedAt
         where p.id = :postId and p.memberId = :memberId and p.status = :activeStatus
        """)
    int updateContentIfActive(
        long postId, long memberId, String title, String content, CommunityPostCategory category, LocalDateTime updatedAt,
        CommunityPostStatus activeStatus
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
