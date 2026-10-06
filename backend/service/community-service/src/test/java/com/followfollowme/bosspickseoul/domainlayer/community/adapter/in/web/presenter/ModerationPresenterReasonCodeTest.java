package com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.presenter;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response.ModerationReportItem;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityReportReasonCode;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityReportTargetKind;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.ReportStatus;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.model.CommunityReport;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 모더레이션 신고 항목(#473)에 사유 코드 {@code {code, name, description}} 과 상세(없으면 null)를 싣고, 레거시 reason 도 그대로 남기는지 검증한다.
 */
class ModerationPresenterReasonCodeTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 2, 12, 0);

    private final ModerationPresenter presenter = new ModerationPresenter();

    @Test
    @DisplayName("사유 코드는 metadata, 상세는 그대로, 레거시 reason 도 유지한다")
    void reasonCodeMetadataAndDetail() {
        List<ModerationReportItem> items = presenter.toReportsResponse(List.of(
            report(1L, "[욕설·비방] 욕을 합니다", CommunityReportReasonCode.ABUSE, "욕을 합니다"),
            report(2L, "스팸·홍보", CommunityReportReasonCode.SPAM, null)
        ), Map.of(), Map.of()).reports();

        assertThat(items).extracting(ModerationReportItem::reasonCode).containsExactly(
            CodeNameDescriptionMetadata.of("ABUSE", "욕설·비방", "욕설·비방"),
            CodeNameDescriptionMetadata.of("SPAM", "스팸·홍보", "스팸·홍보"));
        assertThat(items).extracting(ModerationReportItem::detail).containsExactly("욕을 합니다", null);
        assertThat(items).extracting(ModerationReportItem::reason).containsExactly("[욕설·비방] 욕을 합니다", "스팸·홍보");
        assertThat(items).extracting(ModerationReportItem::reportId).containsExactly("1", "2");
    }

    private static CommunityReport report(long id, String reason, CommunityReportReasonCode reasonCode, String detail) {
        return new CommunityReport(
            id, CommunityReportTargetKind.COMMENT, 800L + id, 30L, reason, reasonCode, detail, NOW, ReportStatus.PENDING, null, null);
    }
}
