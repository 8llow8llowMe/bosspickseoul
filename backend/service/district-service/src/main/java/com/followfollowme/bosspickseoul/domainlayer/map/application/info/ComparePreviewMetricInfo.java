package com.followfollowme.bosspickseoul.domainlayer.map.application.info;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import lombok.Builder;

@Builder
public record ComparePreviewMetricInfo(
    String label,
    double leftValue,
    double rightValue,
    double diffValue,
    double diffRate,
    CodeNameDescriptionMetadata winnerSide
) {

}
