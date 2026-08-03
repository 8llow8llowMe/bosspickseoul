package com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request;

import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.CommunityReportTargetKind;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "신고 등록 요청")
public record CommunityReportCreateRequest(
    @NotNull(message = "COMMUNITY_109:신고 대상 타입은 필수입니다.")
    @Schema(description = "신고 대상 타입", example = "POST")
    CommunityReportTargetKind targetKind,

    @Schema(description = "신고 대상 ID", example = "1001")
    long targetId,

    @NotBlank(message = "COMMUNITY_110:신고 사유는 필수입니다.")
    @Size(max = 500, message = "COMMUNITY_111:신고 사유는 500자 이하만 가능합니다.")
    @Schema(description = "신고 사유", example = "광고성 게시글입니다.")
    String reason
) {

}
