package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.heatmap;

import com.followfollowme.nowdoboss.domainlayer.commercial.application.model.CommercialHeatmapMetricType;
import lombok.Builder;

@Builder
public record CommercialHeatmapScoreInfo(
    String commercialCode,
    String commercialName,
    CommercialHeatmapMetricType metricType,
    Double score,
    String grade,
    String summaryLabel
) {

}
