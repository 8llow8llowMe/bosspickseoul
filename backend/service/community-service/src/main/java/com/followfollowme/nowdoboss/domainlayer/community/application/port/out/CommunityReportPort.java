package com.followfollowme.nowdoboss.domainlayer.community.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityReportTargetKind;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityReport;

public interface CommunityReportPort {

    boolean exists(CommunityReportTargetKind targetKind, long targetId, long reporterMemberId);

    CommunityReport save(CommunityReport report);
}
