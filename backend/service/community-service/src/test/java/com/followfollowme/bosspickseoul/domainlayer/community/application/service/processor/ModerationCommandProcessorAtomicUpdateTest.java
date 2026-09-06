package com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityException;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityCommentRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityPostRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityReportRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityCommentStatus;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityReportTargetKind;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.ModerationDecision;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.ReportStatus;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityComment;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityReport;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ModerationCommandProcessorAtomicUpdateTest {

    private static final long REPORT_ID = 1L;
    private static final long COMMENT_ID = 2L;
    private static final long POST_ID = 3L;
    private static final long MODERATOR_ID = 4L;
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 9, 6, 12, 0);

    @Mock private CommunityReportRepositoryPort communityReportRepositoryPort;
    @Mock private CommunityPostRepositoryPort communityPostRepositoryPort;
    @Mock private CommunityCommentRepositoryPort communityCommentRepositoryPort;

    @InjectMocks private ModerationCommandProcessor processor;

    @Test
    void concurrentlyResolvedReportDoesNotHideTarget() {
        CommunityReport pending = report(ReportStatus.PENDING);
        when(communityReportRepositoryPort.findById(REPORT_ID)).thenReturn(Optional.of(pending));
        when(communityReportRepositoryPort.resolvePending(
            eq(REPORT_ID), eq(ReportStatus.APPROVED), eq(MODERATOR_ID), any(LocalDateTime.class)))
            .thenReturn(false);

        assertThatThrownBy(() -> processor.processReport(
            MODERATOR_ID, REPORT_ID, ModerationDecision.APPROVE_AND_HIDE))
            .isInstanceOf(CommunityException.class)
            .extracting(exception -> ((CommunityException) exception).getErrorCode())
            .isEqualTo(CommunityErrorCode.REPORT_ALREADY_PROCESSED);

        verify(communityCommentRepositoryPort, never()).deleteIfActive(COMMENT_ID);
        verify(communityPostRepositoryPort, never()).decrementCommentCountIfActive(POST_ID);
    }

    @Test
    void alreadyDeletedCommentDoesNotDecrementPostCount() {
        CommunityReport pending = report(ReportStatus.PENDING);
        CommunityReport approved = report(ReportStatus.APPROVED);
        CommunityComment comment = new CommunityComment(
            COMMENT_ID, POST_ID, 5L, null, "content", CommunityCommentStatus.DELETED, 0L, NOW, NOW);
        when(communityReportRepositoryPort.findById(REPORT_ID))
            .thenReturn(Optional.of(pending), Optional.of(approved));
        when(communityReportRepositoryPort.resolvePending(
            eq(REPORT_ID), eq(ReportStatus.APPROVED), eq(MODERATOR_ID), any(LocalDateTime.class)))
            .thenReturn(true);
        when(communityCommentRepositoryPort.findById(COMMENT_ID)).thenReturn(Optional.of(comment));
        when(communityCommentRepositoryPort.deleteIfActive(COMMENT_ID)).thenReturn(false);

        processor.processReport(MODERATOR_ID, REPORT_ID, ModerationDecision.APPROVE_AND_HIDE);

        verify(communityPostRepositoryPort, never()).decrementCommentCountIfActive(POST_ID);
    }

    private CommunityReport report(ReportStatus status) {
        return new CommunityReport(
            REPORT_ID, CommunityReportTargetKind.COMMENT, COMMENT_ID, 10L, "reason", NOW,
            status, status == ReportStatus.PENDING ? null : NOW,
            status == ReportStatus.PENDING ? null : MODERATOR_ID
        );
    }
}
