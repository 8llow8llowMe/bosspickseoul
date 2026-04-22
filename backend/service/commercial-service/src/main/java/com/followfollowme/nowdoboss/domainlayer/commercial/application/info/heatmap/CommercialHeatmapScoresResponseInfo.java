package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.heatmap;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescriptionMetadata;
import com.followfollowme.nowdoboss.common.dto.metadata.ScoreMetricMetadata;
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
