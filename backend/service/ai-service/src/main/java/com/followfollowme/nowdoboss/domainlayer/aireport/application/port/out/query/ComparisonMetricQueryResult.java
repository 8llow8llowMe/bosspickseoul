package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescriptionMetadata;

public record ComparisonMetricQueryResult(
    String label,
    double leftValue,
    double rightValue,
    double diffValue,
    double diffRate,
    CodeNameDescriptionMetadata winnerSide
) {

}
