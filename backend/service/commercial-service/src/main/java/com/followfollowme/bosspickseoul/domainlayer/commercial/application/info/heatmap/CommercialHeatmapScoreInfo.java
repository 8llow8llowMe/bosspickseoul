package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.heatmap;

import com.followfollowme.bosspickseoul.common.dto.metadata.ScoreMetricMetadata;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.candidate.MetricBreakdownInfo;
import java.util.List;
import lombok.Builder;

@Builder
public record CommercialHeatmapScoreInfo(
    String commercialCode,
    String commercialName,
    ScoreMetricMetadata metricType,
    Double score,
    String grade,
    String summaryLabel,
    List<MetricBreakdownInfo> breakdown
) {

}
