package com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityException;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityCommentRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityPostRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityReportRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityCommentStatus;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityPostStatus;
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

        if (decision == ModerationDecision.APPROVE_AND_HIDE) {
            hideTarget(report);
        }

        ReportStatus nextStatus = decision == ModerationDecision.APPROVE_AND_HIDE
            ? ReportStatus.APPROVED
            : ReportStatus.DISMISSED;

        LocalDateTime resolvedAt = LocalDateTime.now();
        return communityReportRepositoryPort.save(new CommunityReport(
            report.id(),
            report.targetKind(),
            report.targetId(),
            report.reporterMemberId(),
            report.reason(),
            report.createdAt(),
            nextStatus,
            resolvedAt,
            moderatorMemberId
        ));
    }

    private void hideTarget(CommunityReport report) {
        if (report.targetKind() == CommunityReportTargetKind.POST) {
            CommunityPost post = communityPostRepositoryPort.findById(report.targetId())
                .orElseThrow(() -> new CommunityException(CommunityErrorCode.POST_NOT_FOUND));
            communityPostRepositoryPort.save(new CommunityPost(
                post.id(),
                post.memberId(),
                post.targetType(),
                post.targetCode(),
                post.targetName(),
                post.title(),
                post.content(),
                CommunityPostStatus.DELETED,
                post.likeCount(),
                post.commentCount(),
                post.viewCount(),
                post.createdAt(),
                LocalDateTime.now()
            ));
        } else {
            CommunityComment comment = communityCommentRepositoryPort.findById(report.targetId())
                .orElseThrow(() -> new CommunityException(CommunityErrorCode.COMMENT_NOT_FOUND));
            communityCommentRepositoryPort.save(new CommunityComment(
                comment.id(),
                comment.postId(),
                comment.memberId(),
                comment.parentCommentId(),
                comment.content(),
                CommunityCommentStatus.DELETED,
                comment.likeCount(),
                comment.createdAt(),
                LocalDateTime.now()
            ));
            communityPostRepositoryPort.findById(comment.postId()).ifPresent(post ->
                communityPostRepositoryPort.save(new CommunityPost(
                    post.id(), post.memberId(), post.targetType(), post.targetCode(), post.targetName(),
                    post.title(), post.content(), post.status(), post.likeCount(),
                    Math.max(0, post.commentCount() - 1), post.viewCount(), post.createdAt(), LocalDateTime.now()
                ))
            );
        }
    }
}
