package com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.repository;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.out.persistence.entity.CommunityReportEntity;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityReportTargetKind;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommunityReportRepository extends JpaRepository<CommunityReportEntity, Long> {

    boolean existsByTargetKindAndTargetIdAndReporterMemberId(
        CommunityReportTargetKind targetKind,
        long targetId,
        long reporterMemberId
    );
}
