package com.followfollowme.nowdoboss.domainlayer.community.domain.model;

import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityReportTargetKind;
import java.time.LocalDateTime;

public record CommunityReport(
    long id,
    CommunityReportTargetKind targetKind,
    long targetId,
    long reporterMemberId,
    String reason,
    LocalDateTime createdAt
) {
}
