package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item;

import com.followfollowme.nowdoboss.common.dto.metadata.ScoreMetricMetadata;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권 히트맵 점수 항목 DTO")
public record CommercialHeatmapScoreItem(

    @Schema(description = "상권 코드", example = "3110008")
    String commercialCode,

    @Schema(description = "상권명", example = "강남역 상권")
    String commercialName,

    @Schema(description = "히트맵 지표 메타데이터")
    ScoreMetricMetadata metricType,

    @Schema(description = "0~100 점수", nullable = true)
    Double score,

    @Schema(description = "점수 등급", example = "HIGH")
    String grade,

    @Schema(description = "요약 라벨")
    String summaryLabel
) {

}
