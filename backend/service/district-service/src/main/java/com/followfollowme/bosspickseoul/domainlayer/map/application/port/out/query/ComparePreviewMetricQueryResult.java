package com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;

public record ComparePreviewMetricQueryResult(
    String label,
    double leftValue,
    double rightValue,
    double diffValue,
    double diffRate,
    CodeNameDescriptionMetadata winnerSide
) {

}
