package com.followfollowme.bosspickseoul.domainlayer.map.application.info;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import com.followfollowme.bosspickseoul.common.dto.metadata.ScoreMetricMetadata;
import lombok.Builder;

@Builder
public record CandidatePresetInfo(
    CodeNameDescriptionMetadata preset,
    ScoreMetricMetadata defaultPriorityMetric
) {

}
