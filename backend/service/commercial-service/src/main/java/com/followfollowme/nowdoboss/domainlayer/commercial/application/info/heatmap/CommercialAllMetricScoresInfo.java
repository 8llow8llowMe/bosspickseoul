package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.heatmap;

import com.followfollowme.nowdoboss.domainlayer.commercial.application.model.CommercialHeatmapMetricType;
import java.util.Map;
import lombok.Builder;

@Builder
public record CommercialAllMetricScoresInfo(
    String commercialCode,
    Map<CommercialHeatmapMetricType, CommercialHeatmapScoreInfo> scoresByMetric
) {

}
