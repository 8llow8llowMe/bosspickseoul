package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison;

import java.util.List;
import lombok.Builder;

@Builder
public record ComparisonGuideInfo(
    String periodBasis,
    String serviceBasis,
    String differenceBasis,
    String diffRateBasis,
    String recommendationDisclaimer,
    List<ComparisonMetricGroupGuideInfo> metricGroups
) {
}
