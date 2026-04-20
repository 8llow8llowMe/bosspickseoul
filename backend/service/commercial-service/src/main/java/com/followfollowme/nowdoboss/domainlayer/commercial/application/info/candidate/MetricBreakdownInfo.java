package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.candidate;

import com.followfollowme.nowdoboss.common.dto.metadata.ScoreMetricMetadata;
import lombok.Builder;

@Builder
public record MetricBreakdownInfo(
    ScoreMetricMetadata metricType,
    Double score,
    String grade,
    String summaryLabel
) {

}
