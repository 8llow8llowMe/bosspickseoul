package com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.request;

import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityValidationMessage;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityReportTargetKind;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "신고 등록 요청")
public record CommunityReportCreateRequest(
    @NotNull(message = CommunityValidationMessage.REPORT_TARGET_KIND_REQUIRED)
    @Schema(description = "신고 대상 타입", example = "POST")
    CommunityReportTargetKind targetKind,

    @Schema(description = "신고 대상 ID", example = "1001")
    long targetId,

    @NotBlank(message = CommunityValidationMessage.REPORT_REASON_REQUIRED)
    @Size(max = 500, message = CommunityValidationMessage.REPORT_REASON_LENGTH_INVALID)
    @Schema(description = "신고 사유", example = "광고성 게시글입니다.")
    String reason
) {

}
