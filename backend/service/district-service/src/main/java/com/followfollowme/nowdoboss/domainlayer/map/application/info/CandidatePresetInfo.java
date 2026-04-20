package com.followfollowme.nowdoboss.domainlayer.map.application.info;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescriptionMetadata;
import com.followfollowme.nowdoboss.common.dto.metadata.ScoreMetricMetadata;
import lombok.Builder;

@Builder
public record CandidatePresetInfo(
    CodeNameDescriptionMetadata preset,
    ScoreMetricMetadata defaultPriorityMetric
) {

}
