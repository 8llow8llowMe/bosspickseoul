package com.followfollowme.nowdoboss.domainlayer.policy.application.service;

import com.followfollowme.nowdoboss.domainlayer.policy.adapter.in.web.dto.response.PolicyRecommendationsResponse;
import com.followfollowme.nowdoboss.domainlayer.policy.adapter.in.web.presenter.PolicyPresenter;
import com.followfollowme.nowdoboss.domainlayer.policy.application.port.in.PolicyWebUseCase;
import com.followfollowme.nowdoboss.domainlayer.policy.application.service.processor.PolicyQueryProcessor;
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
    public PolicyRecommendationsResponse getRecommendations(
        String districtCode,
        String administrationCode,
        String businessType,
        String ageGroup,
        String startupStage
    ) {
        return policyPresenter.toResponse(
            policyQueryProcessor.getRecommendations(districtCode, administrationCode, businessType, ageGroup, startupStage)
        );
    }

    @Override
    public PolicyRecommendationsResponse getComparisonRecommendations(
        String leftCommercialCode,
        String rightCommercialCode,
        String serviceCode,
        String periodCode
    ) {
        return policyPresenter.toResponse(
            policyQueryProcessor.getComparisonRecommendations(leftCommercialCode, rightCommercialCode, serviceCode, periodCode)
        );
    }
}
