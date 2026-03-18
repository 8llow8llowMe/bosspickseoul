package com.followfollowme.nowdoboss.domainlayer.community.application.service;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request.CommunityReportCreateRequest;
import com.followfollowme.nowdoboss.domainlayer.community.application.command.CreateReportCommand;
import com.followfollowme.nowdoboss.domainlayer.community.application.port.in.CommunityReportWebUseCase;
import com.followfollowme.nowdoboss.domainlayer.community.application.service.processor.CommunityCommandProcessor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CommunityReportWebFacade implements CommunityReportWebUseCase {

    private final CommunityCommandProcessor communityCommandProcessor;

    @Override
    public void createReport(long memberId, CommunityReportCreateRequest request) {
        CreateReportCommand command = new CreateReportCommand(request.targetKind(), request.targetId(), request.reason());
        communityCommandProcessor.createReport(memberId, command);
    }
}
