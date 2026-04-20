package com.followfollowme.nowdoboss.domainlayer.map.application.port.out.query;

import com.followfollowme.nowdoboss.common.dto.metadata.ScoreMetricMetadata;

public record CommercialHeatmapScoreQueryResult(
    String commercialCode,
    String commercialLabel,
    ScoreMetricMetadata metricType,
    Double score,
    String grade,
    String summaryLabel
) {

}
