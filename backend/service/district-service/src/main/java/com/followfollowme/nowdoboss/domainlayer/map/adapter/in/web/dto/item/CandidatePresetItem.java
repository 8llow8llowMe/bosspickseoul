package com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.item;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescriptionMetadata;
import com.followfollowme.nowdoboss.common.dto.metadata.ScoreMetricMetadata;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "후보 탐색 프리셋 항목 DTO")
public record CandidatePresetItem(

    @Schema(description = "프리셋 메타데이터")
    CodeNameDescriptionMetadata preset,

    @Schema(description = "기본 우선 지표")
    ScoreMetricMetadata defaultPriorityMetric
) {

}
