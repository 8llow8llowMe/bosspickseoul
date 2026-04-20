package com.followfollowme.nowdoboss.domainlayer.map.application.info;

import com.followfollowme.nowdoboss.common.dto.metadata.ScoreMetricMetadata;
import java.util.List;
import lombok.Builder;

@Builder
public record CommercialHeatmapAreaInfo(
    String areaCode,
    String areaName,
    double centerLng,
    double centerLat,
    List<List<Double>> boundaryCoords,
    ScoreMetricMetadata metricType,
    Double score,
    String grade,
    String summaryLabel
) {

}
