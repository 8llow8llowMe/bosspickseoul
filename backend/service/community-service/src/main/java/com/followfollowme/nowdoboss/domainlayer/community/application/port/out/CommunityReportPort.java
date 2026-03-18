package com.followfollowme.nowdoboss.domainlayer.community.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityReportTargetKind;

public interface CommunityReportPort {

    boolean exists(CommunityReportTargetKind targetKind, long targetId, long reporterMemberId);

    void save(CommunityReportTargetKind targetKind, long targetId, long reporterMemberId, String reason);
}
