package com.followfollowme.bosspickseoul.domainlayer.policy.adapter.in.web.presenter;

import com.followfollowme.bosspickseoul.common.util.ResponseId;
import com.followfollowme.bosspickseoul.domainlayer.policy.adapter.in.web.dto.item.PolicyItem;
import com.followfollowme.bosspickseoul.domainlayer.policy.adapter.in.web.dto.response.PolicyRecommendationResponse;
import com.followfollowme.bosspickseoul.domainlayer.policy.application.info.PolicyRecommendationInfo;
import com.followfollowme.bosspickseoul.domainlayer.policy.domain.model.Policy;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class PolicyPresenter {

    public PolicyRecommendationResponse toRecommendationResponse(PolicyRecommendationInfo info) {
        return PolicyRecommendationResponse.builder()
            .districtCode(info.districtCode())
            .serviceCategoryCode(info.serviceCategoryCode())
            .policies(toItems(info.policies()))
            .build();
    }

    public List<PolicyItem> toItems(List<Policy> policies) {
        return policies.stream().map(this::toItem).toList();
    }

    private PolicyItem toItem(Policy policy) {
        return PolicyItem.builder()
            .policyId(ResponseId.of(policy.id()))
            .title(policy.title())
            .organization(policy.organization())
            .supportType(policy.supportType().name())
            .supportTypeName(policy.supportType().getDisplayName())
            .targetSummary(policy.targetSummary())
            .supportContent(policy.supportContent())
            .districtCode(policy.districtCode())
            .serviceCategoryCode(policy.serviceCategoryCode())
            .applyStartAt(policy.applyStartAt())
            .applyEndAt(policy.applyEndAt())
            .detailUrl(policy.detailUrl())
            .build();
    }
}
