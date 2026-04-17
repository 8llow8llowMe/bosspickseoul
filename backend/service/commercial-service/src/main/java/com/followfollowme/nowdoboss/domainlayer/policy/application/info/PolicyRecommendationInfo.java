package com.followfollowme.nowdoboss.domainlayer.policy.application.info;

import lombok.Builder;

@Builder
public record PolicyRecommendationInfo(
    String policyId,
    String policyName,
    String provider,
    String targetSummary,
    String supportSummary,
    String matchingReason,
    String applicationPeriod,
    String referenceUrl
) {

}
