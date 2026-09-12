package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권 비교 지표 그룹 안내")
public record ComparisonMetricGroupGuideItem(

    @Schema(description = "응답의 지표 그룹 필드명", example = "salesMetrics")
    String code,

    @Schema(description = "지표 그룹 표시명", example = "매출")
    String name,

    @Schema(description = "지표 집계 및 해석 기준")
    String description
) {
}
