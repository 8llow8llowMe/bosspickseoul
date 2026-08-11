package com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.repository;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.entity.CommunityPostEntity;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.repository.custom.CommunityPostCustomRepository;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityPostStatus;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommunityPostRepository extends JpaRepository<CommunityPostEntity, Long>, CommunityPostCustomRepository {

    /** 정리 배치용. 소프트 삭제 후 보존 기간이 지난 행을 끊어 읽는다. */
    List<CommunityPostEntity> findByStatusAndUpdatedAtBefore(
        CommunityPostStatus status, LocalDateTime threshold, Limit limit);

}
