package com.followfollowme.nowdoboss.domainlayer.map.application.port.out.query;

import java.util.List;

public record CandidateCommercialQueryResult(
    int rank,
    String commercialCode,
    String commercialName,
    Double compositeScore,
    String grade,
    String summaryLabel,
    String selectionReason,
    String opportunityLabel,
    String riskLabel,
    List<MetricBreakdownQueryResult> metricBreakdown,
    List<String> reasonTags
) {

}
