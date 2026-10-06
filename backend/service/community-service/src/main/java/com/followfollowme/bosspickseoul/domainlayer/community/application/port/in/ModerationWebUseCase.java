package com.followfollowme.bosspickseoul.domainlayer.community.application.port.in;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.request.ModerationDecisionRequest;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.ModerationDecisionResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.ModerationReportsResponse;

public interface ModerationWebUseCase {

    /** @param reasonCode 사유 코드 필터 문자열 (null/blank 면 전체) — 잘못된 값은 COMMUNITY_018 */
    ModerationReportsResponse getPendingReports(String reasonCode);

    ModerationDecisionResponse processReport(long moderatorMemberId, long reportId, ModerationDecisionRequest request);
}
