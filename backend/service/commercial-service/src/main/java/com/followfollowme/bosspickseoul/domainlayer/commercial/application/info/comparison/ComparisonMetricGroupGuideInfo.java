package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison;

import lombok.Builder;

@Builder
public record ComparisonMetricGroupGuideInfo(
    String code,
    String name,
    String description
) {
}
