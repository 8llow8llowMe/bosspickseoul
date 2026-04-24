package com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityReportTargetKind;
import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.ReportStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;

@Builder
@Schema(description = "신고 항목")
public record ModerationReportItem(

    @Schema(description = "신고 아이디")
    long reportId,

    @Schema(description = "신고 대상 타입 (POST, COMMENT)")
    CommunityReportTargetKind targetKind,

    @Schema(description = "신고 대상 아이디")
    long targetId,

    @Schema(description = "신고한 회원 아이디")
    long reporterMemberId,

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

    @Schema(description = "신고 대상 작성자 아이디 (조회 실패 시 0)")
    long targetAuthorId
) {
}
