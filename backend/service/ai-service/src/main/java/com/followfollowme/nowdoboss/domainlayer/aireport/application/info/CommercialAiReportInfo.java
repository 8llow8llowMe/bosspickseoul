package com.followfollowme.nowdoboss.domainlayer.aireport.application.info;

import java.time.LocalDateTime;
import java.util.List;

public record CommercialAiReportInfo(
    String summary,
    List<String> strengths,
    List<String> risks,
    List<String> recommendedCustomerSegments,
    List<String> recommendedOperatingHours,
    String businessInsight,
    LocalDateTime generatedAt
) {

}
