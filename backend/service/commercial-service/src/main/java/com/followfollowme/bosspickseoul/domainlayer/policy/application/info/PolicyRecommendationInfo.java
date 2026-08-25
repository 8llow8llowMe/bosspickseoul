package com.followfollowme.bosspickseoul.domainlayer.policy.application.info;

import com.followfollowme.bosspickseoul.domainlayer.policy.domain.model.Policy;
import java.util.List;
import lombok.Builder;

@Builder
public record PolicyRecommendationInfo(
    String districtCode,
    String serviceCategoryCode,
    List<Policy> policies
) {

    public static PolicyRecommendationInfo of(String districtCode, String serviceCategoryCode, List<Policy> policies) {
        return PolicyRecommendationInfo.builder()
            .districtCode(districtCode)
            .serviceCategoryCode(serviceCategoryCode)
            .policies(policies)
            .build();
    }
}
