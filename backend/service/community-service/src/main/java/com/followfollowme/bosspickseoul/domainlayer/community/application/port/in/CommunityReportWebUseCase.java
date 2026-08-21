package com.followfollowme.bosspickseoul.domainlayer.community.application.port.in;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.request.CommunityReportCreateRequest;

public interface CommunityReportWebUseCase {

    void createReport(long memberId, CommunityReportCreateRequest request);
}
