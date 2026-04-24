package com.followfollowme.nowdoboss.domainlayer.community.adapter.in.web.dto.request;

import com.followfollowme.nowdoboss.domainlayer.community.domain.enums.ModerationDecision;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "신고 처리 요청")
public record ModerationDecisionRequest(

    @NotNull(message = "처리 결정은 필수입니다.")
    @Schema(description = "처리 결정 (APPROVE_AND_HIDE: 승인 후 숨김, DISMISS: 기각)")
    ModerationDecision decision
) {
}
