package com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import java.util.List;

public record CommercialComparePreviewQueryResult(
    ComparePreviewTargetQueryResult left,
    ComparePreviewTargetQueryResult right,
    CodeNameDescriptionMetadata recommendedSide,
    List<ComparePreviewMetricQueryResult> headlineMetrics,
    String insightOneLiner
) {

}
