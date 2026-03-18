package com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request;

import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityReportTargetKind;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "신고 등록 요청")
public record CommunityReportCreateRequest(
    @NotNull
    @Schema(description = "신고 대상 타입", example = "POST")
    CommunityReportTargetKind targetKind,

    @Schema(description = "신고 대상 ID", example = "1001")
    long targetId,

    @NotBlank
    @Size(max = 500)
    @Schema(description = "신고 사유", example = "광고성 게시글입니다.")
    String reason
) {

}
