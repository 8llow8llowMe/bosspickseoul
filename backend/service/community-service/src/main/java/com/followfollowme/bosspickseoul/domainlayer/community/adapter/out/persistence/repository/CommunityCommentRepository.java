package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.entity.CommunityCommentEntity;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityCommentStatus;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommunityCommentRepository extends JpaRepository<CommunityCommentEntity, Long> {

    /** 정리 배치용. 소프트 삭제 후 보존 기간이 지난 행을 끊어 읽는다. */
    List<CommunityCommentEntity> findByStatusAndUpdatedAtBefore(
        CommunityCommentStatus status, LocalDateTime threshold, Limit limit);

    List<CommunityCommentEntity> findByPostIdAndStatusOrderByCreatedAtAsc(long postId, CommunityCommentStatus status);
}
