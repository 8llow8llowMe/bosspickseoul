package com.followfollowme.nowdoboss.domainlayer.aireport.domain.model;

import java.util.List;

public record CommercialAiDraft(
    String summary,
    List<String> strengths,
    List<String> risks,
    List<String> recommendedCustomerSegments,
    List<String> recommendedOperatingHours,
    String businessInsight
) {

}
