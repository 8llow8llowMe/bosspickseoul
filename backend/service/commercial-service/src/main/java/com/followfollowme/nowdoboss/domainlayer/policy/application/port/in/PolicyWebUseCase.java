package com.followfollowme.nowdoboss.domainlayer.policy.application.port.in;

import com.followfollowme.nowdoboss.domainlayer.policy.adapter.in.web.dto.response.PolicyRecommendationsResponse;

public interface PolicyWebUseCase {

    PolicyRecommendationsResponse getRecommendations(
        String districtCode,
        String administrationCode,
        String businessType,
        String ageGroup,
        String startupStage
    );

    PolicyRecommendationsResponse getComparisonRecommendations(
        String leftCommercialCode,
        String rightCommercialCode,
        String serviceCode,
        String periodCode
    );
}
