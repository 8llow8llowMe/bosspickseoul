package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialComparisonTargetItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.ComparisonMetricItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.model.ComparisonWinnerSide;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "상권 비교 응답 DTO")
public record CommercialComparisonResponse(

    @Schema(description = "좌측 상권 메타 정보")
    CommercialComparisonTargetItem left,

    @Schema(description = "우측 상권 메타 정보")
    CommercialComparisonTargetItem right,

    @Schema(description = "비교 결과 전체 요약")
    String comparisonSummary,

    @Schema(description = "추천 상권 방향", example = "LEFT")
    ComparisonWinnerSide recommendedSide,

    @Schema(description = "추천 이유 목록")
    List<String> recommendedReasons,

    @Schema(description = "주의 사항 목록")
    List<String> cautionPoints,

    @Schema(description = "강세 시간대 요약")
    List<String> dominantTimeSlots,

    @Schema(description = "핵심 연령대 요약")
    List<String> dominantAgeGroups,

    @Schema(description = "현재 업종 기준 적합도 요약")
    String businessFitSummary,

    @Schema(description = "매출 비교")
    List<ComparisonMetricItem> salesMetrics,

    @Schema(description = "유동인구 비교")
    List<ComparisonMetricItem> footTrafficMetrics,

    @Schema(description = "점포 비교")
    List<ComparisonMetricItem> storeMetrics,

    @Schema(description = "소비력 비교")
    List<ComparisonMetricItem> spendingMetrics,

    @Schema(description = "거주인구 비교")
    List<ComparisonMetricItem> residentPopulationMetrics,

    @Schema(description = "시설 비교")
    List<ComparisonMetricItem> facilityMetrics,

    @Schema(description = "매출 시간대 분포 비교")
    List<ComparisonMetricItem> salesTimeSlotMetrics,

    @Schema(description = "매출 연령대 분포 비교")
    List<ComparisonMetricItem> salesAgeMetrics,

    @Schema(description = "매출 연령/성별 분포 비교")
    List<ComparisonMetricItem> salesAgeGenderMetrics,

    @Schema(description = "유동인구 시간대 분포 비교")
    List<ComparisonMetricItem> footTrafficTimeSlotMetrics,

    @Schema(description = "유동인구 연령대 분포 비교")
    List<ComparisonMetricItem> footTrafficAgeMetrics,

    @Schema(description = "유동인구 연령/성별 분포 비교")
    List<ComparisonMetricItem> footTrafficAgeGenderMetrics,

    @Schema(description = "비교 핵심 하이라이트")
    List<String> comparisonHighlights,

    @Schema(description = "비교 요약 하이라이트")
    List<String> highlights
) {
}
