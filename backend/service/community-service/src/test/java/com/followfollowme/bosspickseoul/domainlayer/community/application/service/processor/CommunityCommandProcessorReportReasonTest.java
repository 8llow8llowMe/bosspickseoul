package com.followfollowme.bosspickseoul.domainlayer.community.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.community.application.command.CreateReportCommand;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityException;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityCommentLikeRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityCommentRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityPostLikeRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityPostRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityReportRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.application.port.out.CommunityTargetMetaRepositoryPort;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityCommentStatus;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityPostStatus;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityReportReasonCode;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityReportTargetKind;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityTargetType;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.ReportStatus;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityComment;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityPost;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityReport;
import com.followfollowme.bosspickseoul.persistence.util.SnowflakeIdGenerator;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 신고 등록(#473)이 저장하는 사유 코드·상세·레거시 reason 과, 기존 흐름(대상 검증·중복 신고)이 그대로인지 검증한다.
 */
@ExtendWith(MockitoExtension.class)
class CommunityCommandProcessorReportReasonTest {

    private static final long REPORT_ID = 501L;
    private static final long POST_ID = 10L;
    private static final long COMMENT_ID = 20L;
    private static final long MEMBER_ID = 30L;
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 2, 12, 0);

    @Mock private SnowflakeIdGenerator snowflakeIdGenerator;
    @Mock private CommunityPostRepositoryPort communityPostRepositoryPort;
    @Mock private CommunityCommentRepositoryPort communityCommentRepositoryPort;
    @Mock private CommunityPostLikeRepositoryPort communityPostLikeRepositoryPort;
    @Mock private CommunityCommentLikeRepositoryPort communityCommentLikeRepositoryPort;
    @Mock private CommunityReportRepositoryPort communityReportRepositoryPort;
    @Mock private CommunityTargetMetaRepositoryPort communityTargetMetaRepositoryPort;

    @InjectMocks private CommunityCommandProcessor processor;

    @Test
    @DisplayName("신규 요청은 코드·상세를 저장하고 reason 컬럼에 상세를 넣는다")
    void newRequest_savesCodeDetailAndDetailAsReason() {
        stubPostTarget();

        processor.createReport(MEMBER_ID, command("privacy", "  전화번호가 노출됐습니다 ", "[기타] 무시됨"));

        CommunityReport saved = captureSaved();
        assertThat(saved.reasonCode()).isEqualTo(CommunityReportReasonCode.PRIVACY);
        assertThat(saved.detail()).isEqualTo("전화번호가 노출됐습니다");
        assertThat(saved.reason()).isEqualTo("전화번호가 노출됐습니다");
        assertThat(saved.id()).isEqualTo(REPORT_ID);
        assertThat(saved.targetKind()).isEqualTo(CommunityReportTargetKind.POST);
        assertThat(saved.targetId()).isEqualTo(POST_ID);
        assertThat(saved.reporterMemberId()).isEqualTo(MEMBER_ID);
        assertThat(saved.status()).isEqualTo(ReportStatus.PENDING);
        assertThat(saved.resolvedAt()).isNull();
        assertThat(saved.resolvedByMemberId()).isNull();
    }

    @Test
    @DisplayName("신규 요청에 상세가 없으면 detail 은 null, reason 컬럼에는 코드 표시명을 넣는다")
    void newRequest_withoutDetail_savesDisplayNameAsReason() {
        stubPostTarget();

        processor.createReport(MEMBER_ID, command("SPAM", "   ", null));

        CommunityReport saved = captureSaved();
        assertThat(saved.reasonCode()).isEqualTo(CommunityReportReasonCode.SPAM);
        assertThat(saved.detail()).isNull();
        assertThat(saved.reason()).isEqualTo("스팸·홍보");
    }

    @Test
    @DisplayName("레거시 요청은 접두 라벨을 코드로 되읽고 reason 컬럼에는 받은 원문(trim)을 넣는다")
    void legacyRequest_parsesPrefixAndKeepsOriginalReason() {
        stubPostTarget();

        processor.createReport(MEMBER_ID, command(null, null, "  [욕설·비방] 욕설이 있습니다  "));

        CommunityReport saved = captureSaved();
        assertThat(saved.reasonCode()).isEqualTo(CommunityReportReasonCode.ABUSE);
        assertThat(saved.detail()).isEqualTo("욕설이 있습니다");
        assertThat(saved.reason()).isEqualTo("[욕설·비방] 욕설이 있습니다");
    }

    @Test
    @DisplayName("레거시 자유 입력은 ETC 에 원문을 상세로 둔다")
    void legacyFreeText_isEtc() {
        stubPostTarget();

        processor.createReport(MEMBER_ID, command(null, null, "광고성 게시글입니다."));

        CommunityReport saved = captureSaved();
        assertThat(saved.reasonCode()).isEqualTo(CommunityReportReasonCode.ETC);
        assertThat(saved.detail()).isEqualTo("광고성 게시글입니다.");
        assertThat(saved.reason()).isEqualTo("광고성 게시글입니다.");
    }

    @Test
    @DisplayName("댓글 신고도 ACTIVE 댓글이면 같은 규칙으로 저장한다")
    void commentTarget_isSaved() {
        when(communityCommentRepositoryPort.findById(COMMENT_ID)).thenReturn(Optional.of(comment(CommunityCommentStatus.ACTIVE)));
        when(snowflakeIdGenerator.generateId()).thenReturn(REPORT_ID);

        processor.createReport(MEMBER_ID, new CreateReportCommand(CommunityReportTargetKind.COMMENT, COMMENT_ID, "FALSE_INFO", null, null));

        CommunityReport saved = captureSaved();
        assertThat(saved.targetKind()).isEqualTo(CommunityReportTargetKind.COMMENT);
        assertThat(saved.reasonCode()).isEqualTo(CommunityReportReasonCode.FALSE_INFO);
    }

    @Test
    @DisplayName("잘못된 사유 코드는 대상 조회 전에 COMMUNITY_018 로 거절한다")
    void invalidReasonCode_isRejectedBeforeTargetLookup() {
        assertThatThrownBy(() -> processor.createReport(MEMBER_ID, command("WRONG", null, "광고")))
            .isInstanceOf(CommunityException.class)
            .extracting(exception -> ((CommunityException) exception).getErrorCode())
            .isEqualTo(CommunityErrorCode.INVALID_REPORT_REASON_CODE);

        verifyNoInteractions(communityPostRepositoryPort, communityCommentRepositoryPort, communityReportRepositoryPort);
    }

    @Test
    @DisplayName("이미 신고한 대상이면 저장하지 않고 COMMUNITY_009 다 (기존 흐름 유지)")
    void duplicateReport_isRejected() {
        when(communityPostRepositoryPort.findById(POST_ID)).thenReturn(Optional.of(post()));
        when(communityReportRepositoryPort.exists(CommunityReportTargetKind.POST, POST_ID, MEMBER_ID)).thenReturn(true);

        assertThatThrownBy(() -> processor.createReport(MEMBER_ID, command("SPAM", null, null)))
            .isInstanceOf(CommunityException.class)
            .extracting(exception -> ((CommunityException) exception).getErrorCode())
            .isEqualTo(CommunityErrorCode.DUPLICATE_REPORT);

        verify(communityReportRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("없는 게시글·삭제된 댓글은 404 다 (기존 흐름 유지)")
    void missingTarget_isRejected() {
        when(communityPostRepositoryPort.findById(POST_ID)).thenReturn(Optional.empty());
        when(communityCommentRepositoryPort.findById(COMMENT_ID)).thenReturn(Optional.of(comment(CommunityCommentStatus.DELETED)));

        assertThatThrownBy(() -> processor.createReport(MEMBER_ID, command("SPAM", null, null)))
            .extracting(exception -> ((CommunityException) exception).getErrorCode())
            .isEqualTo(CommunityErrorCode.POST_NOT_FOUND);
        assertThatThrownBy(() -> processor.createReport(
            MEMBER_ID, new CreateReportCommand(CommunityReportTargetKind.COMMENT, COMMENT_ID, "SPAM", null, null)))
            .extracting(exception -> ((CommunityException) exception).getErrorCode())
            .isEqualTo(CommunityErrorCode.COMMENT_NOT_FOUND);

        verify(communityReportRepositoryPort, never()).save(any());
    }

    private void stubPostTarget() {
        when(communityPostRepositoryPort.findById(POST_ID)).thenReturn(Optional.of(post()));
        when(snowflakeIdGenerator.generateId()).thenReturn(REPORT_ID);
    }

    private CommunityReport captureSaved() {
        ArgumentCaptor<CommunityReport> captor = ArgumentCaptor.forClass(CommunityReport.class);
        verify(communityReportRepositoryPort).save(captor.capture());
        return captor.getValue();
    }

    private static CreateReportCommand command(String reasonCode, String detail, String reason) {
        return new CreateReportCommand(CommunityReportTargetKind.POST, POST_ID, reasonCode, detail, reason);
    }

    private static CommunityPost post() {
        return new CommunityPost(
            POST_ID, 99L, CommunityTargetType.COMMERCIAL, "3110008", "상권", "제목", "본문", null,
            null, null, null, null, CommunityPostStatus.ACTIVE, 0L, 0L, 0L, NOW, NOW);
    }

    private static CommunityComment comment(CommunityCommentStatus status) {
        return new CommunityComment(COMMENT_ID, POST_ID, 99L, null, "댓글", status, 0L, NOW, NOW);
    }
}
