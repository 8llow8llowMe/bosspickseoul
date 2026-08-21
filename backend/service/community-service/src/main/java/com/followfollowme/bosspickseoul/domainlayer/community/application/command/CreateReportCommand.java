package com.followfollowme.bosspickseoul.domainlayer.community.application.command;

import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityReportTargetKind;

public record CreateReportCommand(

    CommunityReportTargetKind targetKind,

    long targetId,

    String reason

) {

}
