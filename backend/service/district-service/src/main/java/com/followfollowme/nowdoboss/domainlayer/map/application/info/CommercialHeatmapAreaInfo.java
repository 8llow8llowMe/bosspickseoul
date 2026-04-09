package com.followfollowme.nowdoboss.domainlayer.map.application.info;

import java.util.List;
import lombok.Builder;

@Builder
public record CommercialHeatmapAreaInfo(
    String areaCode,
    String areaName,
    double centerLng,
    double centerLat,
    List<List<Double>> boundaryCoords,
    String metricType,
    Double score,
    String grade,
    String summaryLabel
) {

}
