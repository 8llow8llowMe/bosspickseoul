package com.followfollowme.bosspickseoul.domainlayer.map.application.info;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import java.util.List;
import lombok.Builder;

@Builder
public record CommercialComparePreviewInfo(
    ComparePreviewTargetInfo left,
    ComparePreviewTargetInfo right,
    CodeNameDescriptionMetadata recommendedSide,
    List<ComparePreviewMetricInfo> headlineMetrics,
    String insightOneLiner
) {

}
