package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query;

public record ComparisonMetricQueryResult(
    String label,
    double leftValue,
    double rightValue,
    double diffValue,
    double diffRate,
    String winnerSide
) {

}
