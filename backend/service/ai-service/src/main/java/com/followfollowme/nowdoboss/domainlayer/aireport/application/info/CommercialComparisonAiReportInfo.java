package com.followfollowme.nowdoboss.domainlayer.aireport.application.info;

import java.time.LocalDateTime;
import java.util.List;

public record CommercialComparisonAiReportInfo(
    String summary,
    String recommendedSide,
    List<String> recommendedReasons,
    String riskComparison,
    String timeSlotInsight,
    String customerSegmentInsight,
    List<String> operationStrategy,
    String businessInsight,
    LocalDateTime generatedAt
) {

}
