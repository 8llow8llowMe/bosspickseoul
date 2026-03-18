package com.followfollowme.nowdoboss.domainlayer.community.application.command;

import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityReportTargetKind;

public record CreateReportCommand(

    CommunityReportTargetKind targetKind,

    long targetId,

    String reason

) {

}
