package com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.item;

import com.followfollowme.nowdoboss.common.dto.metadata.ScoreMetricMetadata;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "후보 상권 지표별 점수 항목 DTO")
public record MetricBreakdownItem(

    @Schema(description = "지표 메타데이터")
    ScoreMetricMetadata metricType,

    @Schema(description = "0~100 정규화 점수", nullable = true)
    Double score,

    @Schema(description = "점수 등급", example = "HIGH")
    String grade,

    @Schema(description = "요약 라벨", example = "기회도 높음")
    String summaryLabel
) {

}
