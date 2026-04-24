package com.followfollowme.nowdoboss.domainlayer.community.application.service;

import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request.ModerationDecisionRequest;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.ModerationDecisionResponse;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response.ModerationReportsResponse;
import com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.presenter.ModerationPresenter;
import com.followfollowme.nowdoboss.domainlayer.community.application.port.in.ModerationWebUseCase;
import com.followfollowme.nowdoboss.domainlayer.community.application.service.processor.ModerationCommandProcessor;
import com.followfollowme.nowdoboss.domainlayer.community.application.service.processor.ModerationQueryProcessor;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityReportTargetKind;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityComment;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityPost;
import com.followfollowme.nowdoboss.domainlayer.community.domain.model.CommunityReport;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
        Map<Long, CommunityPost> postsById = new HashMap<>();
        Map<Long, CommunityComment> commentsById = new HashMap<>();
        for (CommunityReport report : reports) {
            if (report.targetKind() == CommunityReportTargetKind.POST) {
                moderationQueryProcessor.findPostById(report.targetId())
                    .ifPresent(post -> postsById.put(report.targetId(), post));
            } else {
                moderationQueryProcessor.findCommentById(report.targetId())
                    .ifPresent(comment -> commentsById.put(report.targetId(), comment));
            }
        }
        return moderationPresenter.toReportsResponse(reports, postsById, commentsById);
    }

    @Override
    @Transactional
    public ModerationDecisionResponse processReport(long moderatorMemberId, long reportId, ModerationDecisionRequest request) {
        CommunityReport resolved = moderationCommandProcessor.processReport(moderatorMemberId, reportId, request.decision());
        return moderationPresenter.toDecisionResponse(resolved, request.decision());
    }
}
