package com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.repository;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.entity.CommunityPostLikeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommunityPostLikeRepository extends JpaRepository<CommunityPostLikeEntity, Long> {

    boolean existsByPostIdAndMemberId(long postId, long memberId);

    void deleteByPostIdAndMemberId(long postId, long memberId);
}
