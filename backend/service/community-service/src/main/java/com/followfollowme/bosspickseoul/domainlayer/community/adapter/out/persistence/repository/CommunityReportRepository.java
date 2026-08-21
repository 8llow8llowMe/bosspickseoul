package com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.repository;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.out.persistence.entity.CommunityReportEntity;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityReportTargetKind;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.ReportStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommunityReportRepository extends JpaRepository<CommunityReportEntity, Long> {

    boolean existsByTargetKindAndTargetIdAndReporterMemberId(
        CommunityReportTargetKind targetKind,
        long targetId,
        long reporterMemberId
    );

    List<CommunityReportEntity> findByStatusOrderByCreatedAtAsc(ReportStatus status);
}
