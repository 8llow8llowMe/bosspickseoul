package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.preview;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescriptionMetadata;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.comparison.CommercialComparisonTargetInfo;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.comparison.ComparisonMetricInfo;
import java.util.List;
import lombok.Builder;

@Builder
public record CommercialComparePreviewInfo(
    CommercialComparisonTargetInfo left,
    CommercialComparisonTargetInfo right,
    CodeNameDescriptionMetadata recommendedSide,
    List<ComparisonMetricInfo> headlineMetrics
) {

}
