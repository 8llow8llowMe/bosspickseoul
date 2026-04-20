package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.comparison;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescriptionMetadata;
import lombok.Builder;

@Builder
public record ComparisonMetricInfo(
    String label,
    double leftValue,
    double rightValue,
    double diffValue,
    double diffRate,
    CodeNameDescriptionMetadata winnerSide
) {

}
