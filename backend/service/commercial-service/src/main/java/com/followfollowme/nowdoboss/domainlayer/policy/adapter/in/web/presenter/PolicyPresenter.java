package com.followfollowme.nowdoboss.domainlayer.policy.adapter.in.web.presenter;

import com.followfollowme.nowdoboss.domainlayer.policy.adapter.in.web.dto.item.PolicyRecommendationItem;
import com.followfollowme.nowdoboss.domainlayer.policy.adapter.in.web.dto.response.PolicyRecommendationsResponse;
import com.followfollowme.nowdoboss.domainlayer.policy.application.info.PolicyRecommendationInfo;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class PolicyPresenter {

    public PolicyRecommendationsResponse toResponse(List<PolicyRecommendationInfo> infos) {
        return PolicyRecommendationsResponse.builder()
            .policies(infos.stream().map(this::toItem).toList())
            .build();
    }

    private PolicyRecommendationItem toItem(PolicyRecommendationInfo info) {
        return PolicyRecommendationItem.builder()
            .policyId(info.policyId())
            .policyName(info.policyName())
            .provider(info.provider())
            .targetSummary(info.targetSummary())
            .supportSummary(info.supportSummary())
            .matchingReason(info.matchingReason())
            .applicationPeriod(info.applicationPeriod())
            .referenceUrl(info.referenceUrl())
            .build();
    }
}
