package com.followfollowme.bosspickseoul.domainlayer.policy.application.service;

import com.followfollowme.bosspickseoul.domainlayer.policy.adapter.in.web.dto.response.PolicyRecommendationResponse;
import com.followfollowme.bosspickseoul.domainlayer.policy.adapter.in.web.presenter.PolicyPresenter;
import com.followfollowme.bosspickseoul.domainlayer.policy.application.port.in.PolicyWebUseCase;
import com.followfollowme.bosspickseoul.domainlayer.policy.application.service.processor.PolicyQueryProcessor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PolicyWebFacade implements PolicyWebUseCase {

    private final PolicyQueryProcessor policyQueryProcessor;
    private final PolicyPresenter policyPresenter;

    @Override
    public PolicyRecommendationResponse getRecommendations(String districtCode, String serviceCode, int size) {
        return policyPresenter.toRecommendationResponse(
            policyQueryProcessor.getRecommendations(districtCode, serviceCode, size));
    }
}
