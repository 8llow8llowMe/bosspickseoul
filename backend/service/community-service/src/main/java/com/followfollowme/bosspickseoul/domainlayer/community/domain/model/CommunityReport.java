package com.followfollowme.bosspickseoul.domainlayer.community.domain.model;

import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityReportTargetKind;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.ReportStatus;
import java.time.LocalDateTime;

public record CommunityReport(
    long id,
    CommunityReportTargetKind targetKind,
    long targetId,
    long reporterMemberId,
    String reason,
    LocalDateTime createdAt,
    ReportStatus status,
    LocalDateTime resolvedAt,
    Long resolvedByMemberId
) {
}
