package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.heatmap;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import com.followfollowme.bosspickseoul.common.dto.metadata.ScoreMetricMetadata;
import java.util.List;
import lombok.Builder;

@Builder
public record CommercialHeatmapScoresResponseInfo(
    CodeNameDescriptionMetadata mode,
    String serviceCode,
    String periodCode,
    ScoreMetricMetadata metricType,
    CodeNameDescriptionMetadata preset,
    ScoreMetricMetadata priorityMetric,
    String summary,
    List<CommercialHeatmapScoreInfo> scores
) {

}
