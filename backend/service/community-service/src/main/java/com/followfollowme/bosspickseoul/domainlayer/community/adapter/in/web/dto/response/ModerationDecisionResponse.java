package com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.ModerationDecision;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.ReportStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;

@Builder
@Schema(description = "신고 처리 결과 응답")
public record ModerationDecisionResponse(

    @Schema(description = "신고 아이디")
    long reportId,

    @Schema(description = "처리 결정")
    ModerationDecision decision,

    @Schema(description = "처리 후 상태")
    ReportStatus status,

    @Schema(description = "처리 시각")
    LocalDateTime resolvedAt
) {
}
