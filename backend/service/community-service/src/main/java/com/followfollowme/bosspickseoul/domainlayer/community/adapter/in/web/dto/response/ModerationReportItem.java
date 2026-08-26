package com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityReportTargetKind;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.ReportStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;

@Builder
@Schema(description = "신고 항목")
public record ModerationReportItem(

    @Schema(description = "신고 아이디")
    String reportId,

    @Schema(description = "신고 대상 타입 (POST, COMMENT)")
    CommunityReportTargetKind targetKind,

    @Schema(description = "신고 대상 아이디")
    String targetId,

    @Schema(description = "신고한 회원 아이디")
    String reporterMemberId,

    @Schema(description = "신고 사유")
    String reason,

    @Schema(description = "신고 상태")
    ReportStatus status,

    @Schema(description = "신고 생성 시각")
    LocalDateTime createdAt,

    @Schema(description = "신고 대상 제목 (POST 일 때만 존재, COMMENT 는 null)")
    String targetTitle,

    @Schema(description = "신고 대상 내용 미리보기 (최대 100자)")
    String targetPreview,

    @Schema(description = "신고 대상 작성자 아이디 (대상이 이미 삭제되어 조회되지 않으면 null)",
        example = "7345678901234567890", nullable = true)
    String targetAuthorId
) {
}
