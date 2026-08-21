package com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query;

import com.followfollowme.bosspickseoul.common.dto.metadata.ScoreMetricMetadata;

public record CommercialHeatmapScoreQueryResult(
    String commercialCode,
    String commercialName,
    ScoreMetricMetadata metricType,
    Double score,
    String grade,
    String summaryLabel
) {

}
