package com.followfollowme.nowdoboss.domainlayer.aireport.domain.model;

import java.util.List;

public record CommercialAiDraft(
    String summary,
    List<String> strengths,
    List<String> risks,
    List<String> recommendedBusinessCategories,
    List<String> recommendedCustomerSegments,
    List<String> recommendedOperatingHours,
    List<String> avoidOperatingHours,
    List<String> targetAgeGroups,
    List<String> targetGenders,
    List<String> operationTips,
    String businessInsight
) {

}
