package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.preview;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison.CommercialComparisonTargetInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison.ComparisonMetricInfo;
import java.util.List;
import lombok.Builder;

@Builder
public record CommercialComparePreviewInfo(
    CommercialComparisonTargetInfo left,
    CommercialComparisonTargetInfo right,
    CodeNameDescriptionMetadata recommendedSide,
    List<ComparisonMetricInfo> headlineMetrics,
    String insightOneLiner
) {

}
