package com.followfollowme.nowdoboss.domainlayer.community.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityReportTargetKind;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityReport;
import java.util.List;
import java.util.Optional;

public interface CommunityReportRepositoryPort {

    boolean exists(CommunityReportTargetKind targetKind, long targetId, long reporterMemberId);

    CommunityReport save(CommunityReport report);

    List<CommunityReport> findPendingReports();

    Optional<CommunityReport> findById(long reportId);
}
