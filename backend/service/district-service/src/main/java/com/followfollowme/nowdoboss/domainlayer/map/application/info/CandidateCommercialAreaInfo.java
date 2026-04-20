package com.followfollowme.nowdoboss.domainlayer.map.application.info;

import java.util.List;
import lombok.Builder;

@Builder
public record CandidateCommercialAreaInfo(
    int rank,
    String areaCode,
    String areaName,
    Double centerLng,
    Double centerLat,
    List<List<Double>> boundaryCoords,
    Double compositeScore,
    String grade,
    String summaryLabel,
    List<MetricBreakdownInfo> metricBreakdown,
    List<String> reasonTags
) {

}
