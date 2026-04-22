package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.profile;

import com.followfollowme.nowdoboss.domainlayer.policy.application.info.PolicyRecommendationInfo;
import java.util.List;
import lombok.Builder;

@Builder
public record CommercialProfileInfo(
    String commercialCode,
    String commercialName,
    String districtCode,
    String districtName,
    String administrationCode,
    String administrationName,
    CommercialProfileKeyMetricsInfo keyMetrics,
    List<PolicyRecommendationInfo> policyRecommendations
) {

}
