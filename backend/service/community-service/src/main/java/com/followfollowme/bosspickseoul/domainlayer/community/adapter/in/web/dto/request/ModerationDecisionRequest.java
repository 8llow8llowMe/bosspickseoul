package com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.request;

import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityValidationMessage;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.ModerationDecision;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "신고 처리 요청")
public record ModerationDecisionRequest(

    @NotNull(message = CommunityValidationMessage.MODERATION_DECISION_REQUIRED)
    @Schema(description = "처리 결정 (APPROVE_AND_HIDE: 승인 후 숨김, DISMISS: 기각)")
    ModerationDecision decision
) {
}
