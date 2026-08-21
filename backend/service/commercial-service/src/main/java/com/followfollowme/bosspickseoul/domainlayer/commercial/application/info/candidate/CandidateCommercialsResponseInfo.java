package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.candidate;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import com.followfollowme.bosspickseoul.common.dto.metadata.ScoreMetricMetadata;
import java.util.List;
import lombok.Builder;

@Builder
public record CandidateCommercialsResponseInfo(
    String serviceCode,
    String periodCode,
    CodeNameDescriptionMetadata preset,
    ScoreMetricMetadata priorityMetric,
    int topN,
    String summary,
    List<CandidateCommercialInfo> items
) {

}
