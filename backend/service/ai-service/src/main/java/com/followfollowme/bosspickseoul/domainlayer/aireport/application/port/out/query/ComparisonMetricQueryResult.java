package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;

public record ComparisonMetricQueryResult(
    String label,
    double leftValue,
    double rightValue,
    double diffValue,
    double diffRate,
    CodeNameDescriptionMetadata winnerSide
) {

}
