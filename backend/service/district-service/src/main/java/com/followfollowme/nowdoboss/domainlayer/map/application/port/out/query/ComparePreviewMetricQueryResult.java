package com.followfollowme.nowdoboss.domainlayer.map.application.port.out.query;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescriptionMetadata;

public record ComparePreviewMetricQueryResult(
    String label,
    double leftValue,
    double rightValue,
    double diffValue,
    double diffRate,
    CodeNameDescriptionMetadata winnerSide
) {

}
