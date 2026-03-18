package com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.repository;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.entity.CommunityCommentEntity;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityCommentStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommunityCommentRepository extends JpaRepository<CommunityCommentEntity, Long> {

    List<CommunityCommentEntity> findByPostIdAndStatusOrderByCreatedAtAsc(long postId, CommunityCommentStatus status);
}
