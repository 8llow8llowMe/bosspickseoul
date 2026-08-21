package com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import com.followfollowme.bosspickseoul.common.dto.metadata.ScoreMetricMetadata;
import java.util.List;
import lombok.Builder;

@Builder
public record CommercialHeatmapScoresQueryResult(
    CodeNameDescriptionMetadata mode,
    String serviceCode,
    String periodCode,
    ScoreMetricMetadata metricType,
    CodeNameDescriptionMetadata preset,
    ScoreMetricMetadata priorityMetric,
    String summary,
    List<CommercialHeatmapScoreQueryResult> scores
) {

}
