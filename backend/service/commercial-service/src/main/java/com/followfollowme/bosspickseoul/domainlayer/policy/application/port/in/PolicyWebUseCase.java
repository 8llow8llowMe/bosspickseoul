package com.followfollowme.bosspickseoul.domainlayer.policy.application.port.in;

import com.followfollowme.bosspickseoul.domainlayer.policy.adapter.in.web.dto.response.PolicyRecommendationResponse;

public interface PolicyWebUseCase {

    PolicyRecommendationResponse getRecommendations(String districtCode, String serviceCode, int size);
}
