package com.followfollowme.nowdoboss.domainlayer.map.application.port.out.query;

public record CommercialHeatmapScoreQueryResult(
    String commercialCode,
    String commercialLabel,
    String metricType,
    Double score,
    String grade,
    String summaryLabel
) {

}
