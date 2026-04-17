package com.followfollowme.nowdoboss.domainlayer.policy.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
public record PolicyRecommendationItem(
    @Schema(description = "정책 ID")
    String policyId,
    @Schema(description = "정책명")
    String policyName,
    @Schema(description = "제공 기관")
    String provider,
    @Schema(description = "지원 대상 요약")
    String targetSummary,
    @Schema(description = "지원 내용 요약")
    String supportSummary,
    @Schema(description = "매칭 이유")
    String matchingReason,
    @Schema(description = "신청 기간")
    String applicationPeriod,
    @Schema(description = "참고 URL")
    String referenceUrl
) {

}
