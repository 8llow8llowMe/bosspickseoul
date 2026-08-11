package com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.repository;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.entity.CommunityPostImageEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CommunityPostImageRepository extends JpaRepository<CommunityPostImageEntity, Long> {

    List<CommunityPostImageEntity> findByPostIdOrderBySortOrderAsc(Long postId);

    List<CommunityPostImageEntity> findByPostIdInOrderBySortOrderAsc(List<Long> postIds);

    void deleteByPostId(Long postId);

    /** 고아 객체 판정용. 현재 게시글에 연결된 모든 키를 반환한다. */
    @Query("select image.imageKey from CommunityPostImageEntity image")
    List<String> findAllImageKeys();

    void deleteByPostIdIn(List<Long> postIds);
}
