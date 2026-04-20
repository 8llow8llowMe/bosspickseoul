package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.candidate;

import java.util.List;
import lombok.Builder;

@Builder
public record CandidateCommercialInfo(
    int rank,
    String commercialCode,
    String commercialName,
    Double compositeScore,
    String grade,
    String summaryLabel,
    List<MetricBreakdownInfo> metricBreakdown,
    List<String> reasonTags
) {

}
