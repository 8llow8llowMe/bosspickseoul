package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.heatmap;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.model.CommercialHeatmapMetricType;
import java.util.Map;
import lombok.Builder;

@Builder
public record CommercialAllMetricScoresInfo(
    String commercialCode,
    String commercialName,
    Map<CommercialHeatmapMetricType, CommercialHeatmapScoreInfo> scoresByMetric
) {

}
