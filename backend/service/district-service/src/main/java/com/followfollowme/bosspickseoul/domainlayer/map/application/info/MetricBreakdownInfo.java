package com.followfollowme.bosspickseoul.domainlayer.map.application.info;

import com.followfollowme.bosspickseoul.common.dto.metadata.ScoreMetricMetadata;
import lombok.Builder;

@Builder
public record MetricBreakdownInfo(
    ScoreMetricMetadata metricType,
    Double score,
    String grade,
    String summaryLabel
) {

}
