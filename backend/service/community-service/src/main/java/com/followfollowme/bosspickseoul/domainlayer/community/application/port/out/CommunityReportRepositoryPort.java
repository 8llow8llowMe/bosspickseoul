package com.followfollowme.bosspickseoul.domainlayer.community.application.port.out;

import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityReportReasonCode;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityReportTargetKind;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityReport;
import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.ReportStatus;

public interface CommunityReportRepositoryPort {

    boolean exists(CommunityReportTargetKind targetKind, long targetId, long reporterMemberId);

    CommunityReport save(CommunityReport report);

    /** PENDING 신고 전체, 오래된 순. */
    List<CommunityReport> findPendingReports();

    /** PENDING 신고 중 사유 코드가 같은 것, 오래된 순. */
    List<CommunityReport> findPendingReportsByReasonCode(CommunityReportReasonCode reasonCode);

    Optional<CommunityReport> findById(long reportId);

    boolean resolvePending(
        long reportId, ReportStatus status, long resolvedByMemberId, LocalDateTime resolvedAt);
}
