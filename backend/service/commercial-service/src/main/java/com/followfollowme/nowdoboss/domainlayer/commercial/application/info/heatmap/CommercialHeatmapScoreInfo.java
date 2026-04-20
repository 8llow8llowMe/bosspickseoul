package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.heatmap;

import com.followfollowme.nowdoboss.common.dto.metadata.ScoreMetricMetadata;
import lombok.Builder;

@Builder
public record CommercialHeatmapScoreInfo(
    String commercialCode,
    String commercialName,
    ScoreMetricMetadata metricType,
    Double score,
    String grade,
    String summaryLabel
) {

}
