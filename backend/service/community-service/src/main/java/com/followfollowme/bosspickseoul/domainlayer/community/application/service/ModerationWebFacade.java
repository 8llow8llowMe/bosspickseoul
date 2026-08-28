package com.followfollowme.bosspickseoul.domainlayer.community.application.service;

import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.request.ModerationDecisionRequest;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.ModerationDecisionResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.ModerationReportsResponse;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.presenter.ModerationPresenter;
import com.followfollowme.bosspickseoul.domainlayer.community.application.model.ModerationReportTargets;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.in.ModerationWebUseCase;
import com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor.ModerationCommandProcessor;
import com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor.ModerationQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityReport;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ModerationWebFacade implements ModerationWebUseCase {

    private final ModerationQueryProcessor moderationQueryProcessor;
    private final ModerationCommandProcessor moderationCommandProcessor;
    private final ModerationPresenter moderationPresenter;

    @Override
    @Transactional(readOnly = true)
    public ModerationReportsResponse getPendingReports() {
        List<CommunityReport> reports = moderationQueryProcessor.findPendingReports();
        ModerationReportTargets targets = moderationQueryProcessor.findReportTargets(reports);

        return moderationPresenter.toReportsResponse(reports, targets.postsById(), targets.commentsById());
    }

    @Override
    @Transactional
    public ModerationDecisionResponse processReport(long moderatorMemberId, long reportId, ModerationDecisionRequest request) {
        CommunityReport resolved = moderationCommandProcessor.processReport(moderatorMemberId, reportId, request.decision());
        return moderationPresenter.toDecisionResponse(resolved, request.decision());
    }
}
