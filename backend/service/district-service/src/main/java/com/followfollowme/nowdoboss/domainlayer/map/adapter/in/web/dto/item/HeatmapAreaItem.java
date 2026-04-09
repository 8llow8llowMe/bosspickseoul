package com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
public record HeatmapAreaItem(
    @Schema(description = "영역 코드", example = "3110008")
    String areaCode,
    @Schema(description = "영역 이름")
    String areaName,
    @Schema(description = "중심 경도")
    double centerLng,
    @Schema(description = "중심 위도")
    double centerLat,
    @Schema(description = "영역 경계 좌표")
    List<List<Double>> boundaryCoords,
    @Schema(description = "히트맵 지표 타입", example = "OPPORTUNITY_SCORE")
    String metricType,
    @Schema(description = "0~100 점수", nullable = true)
    Double score,
    @Schema(description = "점수 등급", example = "HIGH")
    String grade,
    @Schema(description = "요약 라벨")
    String summaryLabel
) {

}
