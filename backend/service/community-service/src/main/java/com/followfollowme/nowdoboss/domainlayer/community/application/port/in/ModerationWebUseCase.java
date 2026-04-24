package com.followfollowme.nowdoboss.domainlayer.community.application.port.in;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request.ModerationDecisionRequest;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.ModerationDecisionResponse;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.ModerationReportsResponse;

public interface ModerationWebUseCase {

    ModerationReportsResponse getPendingReports();

    ModerationDecisionResponse processReport(long moderatorMemberId, long reportId, ModerationDecisionRequest request);
}
