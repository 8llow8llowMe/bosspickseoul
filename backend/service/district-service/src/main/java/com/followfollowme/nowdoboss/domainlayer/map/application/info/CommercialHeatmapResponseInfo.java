package com.followfollowme.nowdoboss.domainlayer.map.application.info;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescriptionMetadata;
import com.followfollowme.nowdoboss.common.dto.metadata.ScoreMetricMetadata;
import java.util.List;
import lombok.Builder;

@Builder
public record CommercialHeatmapResponseInfo(
    CodeNameDescriptionMetadata mode,
    String serviceCode,
    String periodCode,
    ScoreMetricMetadata metricType,
    CodeNameDescriptionMetadata preset,
    ScoreMetricMetadata priorityMetric,
    String summary,
    List<CommercialHeatmapAreaInfo> areas
) {

}
