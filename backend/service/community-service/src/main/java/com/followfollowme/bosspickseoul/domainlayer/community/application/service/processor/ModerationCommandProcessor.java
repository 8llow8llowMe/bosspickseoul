package com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityException;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityCommentRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityPostRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityReportRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityReportTargetKind;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.ModerationDecision;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.ReportStatus;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityComment;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityPost;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityReport;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class ModerationCommandProcessor {

    private final CommunityReportRepositoryPort communityReportRepositoryPort;
    private final CommunityPostRepositoryPort communityPostRepositoryPort;
    private final CommunityCommentRepositoryPort communityCommentRepositoryPort;

    @Transactional
    public CommunityReport processReport(long moderatorMemberId, long reportId, ModerationDecision decision) {
        CommunityReport report = communityReportRepositoryPort.findById(reportId)
            .orElseThrow(() -> new CommunityException(CommunityErrorCode.REPORT_NOT_FOUND));

        if (report.status() != ReportStatus.PENDING) {
            throw new CommunityException(CommunityErrorCode.REPORT_ALREADY_PROCESSED);
        }

        ReportStatus nextStatus = decision == ModerationDecision.APPROVE_AND_HIDE
            ? ReportStatus.APPROVED
            : ReportStatus.DISMISSED;

        LocalDateTime resolvedAt = LocalDateTime.now();
        if (!communityReportRepositoryPort.resolvePending(
            report.id(), nextStatus, moderatorMemberId, resolvedAt)) {
            throw new CommunityException(CommunityErrorCode.REPORT_ALREADY_PROCESSED);
        }

        if (decision == ModerationDecision.APPROVE_AND_HIDE) {
            hideTarget(report);
        }

        return communityReportRepositoryPort.findById(report.id())
            .orElseThrow(() -> new CommunityException(CommunityErrorCode.REPORT_NOT_FOUND));
    }

    private void hideTarget(CommunityReport report) {
        if (report.targetKind() == CommunityReportTargetKind.POST) {
            CommunityPost post = communityPostRepositoryPort.findById(report.targetId())
                .orElseThrow(() -> new CommunityException(CommunityErrorCode.POST_NOT_FOUND));
            communityPostRepositoryPort.deleteIfActive(post.id());
        } else {
            CommunityComment comment = communityCommentRepositoryPort.findById(report.targetId())
                .orElseThrow(() -> new CommunityException(CommunityErrorCode.COMMENT_NOT_FOUND));
            if (communityCommentRepositoryPort.deleteIfActive(comment.id())) {
                communityPostRepositoryPort.decrementCommentCountIfActive(comment.postId());
            }
        }
    }
}
