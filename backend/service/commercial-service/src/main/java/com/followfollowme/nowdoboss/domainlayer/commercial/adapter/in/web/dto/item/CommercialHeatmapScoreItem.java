package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item;

import com.followfollowme.nowdoboss.domainlayer.commercial.application.model.CommercialHeatmapMetricType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
public record CommercialHeatmapScoreItem(
    @Schema(description = "상권 코드", example = "3110008")
    String commercialCode,
    @Schema(description = "상권명", example = "강남역")
    String commercialName,
    @Schema(description = "지표 타입", example = "OPPORTUNITY_SCORE")
    CommercialHeatmapMetricType metricType,
    @Schema(description = "0~100 점수", nullable = true)
    Double score,
    @Schema(description = "점수 등급", example = "HIGH")
    String grade,
    @Schema(description = "요약 라벨")
    String summaryLabel
) {

}
