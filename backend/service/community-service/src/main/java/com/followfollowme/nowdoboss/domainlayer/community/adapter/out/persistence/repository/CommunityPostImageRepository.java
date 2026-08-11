package com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.repository;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.entity.CommunityPostImageEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommunityPostImageRepository extends JpaRepository<CommunityPostImageEntity, Long> {

    List<CommunityPostImageEntity> findByPostIdOrderBySortOrderAsc(Long postId);

    List<CommunityPostImageEntity> findByPostIdInOrderBySortOrderAsc(List<Long> postIds);

    void deleteByPostId(Long postId);
}
