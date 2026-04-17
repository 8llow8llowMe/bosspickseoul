package com.followfollowme.nowdoboss.domainlayer.aireport.domain.model;

import java.util.List;

public record CommercialComparisonAiDraft(
    String summary,
    String recommendedSide,
    List<String> recommendedReasons,
    String riskComparison,
    String timeSlotInsight,
    String customerSegmentInsight,
    List<String> operationStrategy,
    String businessInsight
) {
}
