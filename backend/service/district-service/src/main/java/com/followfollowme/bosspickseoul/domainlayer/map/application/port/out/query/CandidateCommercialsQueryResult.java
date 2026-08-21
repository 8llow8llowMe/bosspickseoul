package com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import com.followfollowme.bosspickseoul.common.dto.metadata.ScoreMetricMetadata;
import java.util.List;

public record CandidateCommercialsQueryResult(
    String serviceCode,
    String periodCode,
    CodeNameDescriptionMetadata preset,
    ScoreMetricMetadata priorityMetric,
    Integer topN,
    String summary,
    List<CandidateCommercialQueryResult> items
) {

}
