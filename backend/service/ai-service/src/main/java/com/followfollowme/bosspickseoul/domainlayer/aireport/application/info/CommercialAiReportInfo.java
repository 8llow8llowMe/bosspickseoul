package com.followfollowme.bosspickseoul.domainlayer.aireport.application.info;

import java.time.LocalDateTime;
import java.util.List;

public record CommercialAiReportInfo(
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
    String businessInsight,
    LocalDateTime generatedAt
) {

}
