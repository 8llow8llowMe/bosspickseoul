package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialComparisonTargetItem;
import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.ComparisonMetricItem;
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
    @Schema(description = "매출 비교")
    List<ComparisonMetricItem> salesMetrics,
    @Schema(description = "유동인구 비교")
    List<ComparisonMetricItem> footTrafficMetrics,
    @Schema(description = "점포 비교")
    List<ComparisonMetricItem> storeMetrics,
    @Schema(description = "소비력 및 지출 비교")
    List<ComparisonMetricItem> spendingMetrics,
    @Schema(description = "거주인구 비교")
    List<ComparisonMetricItem> residentPopulationMetrics,
    @Schema(description = "시설 비교")
    List<ComparisonMetricItem> facilityMetrics,
    @Schema(description = "매출 시간대 비교")
    List<ComparisonMetricItem> salesTimeSlotMetrics,
    @Schema(description = "매출 연령대 비교")
    List<ComparisonMetricItem> salesAgeMetrics,
    @Schema(description = "유동인구 시간대 비교")
    List<ComparisonMetricItem> footTrafficTimeSlotMetrics,
    @Schema(description = "유동인구 연령대 비교")
    List<ComparisonMetricItem> footTrafficAgeMetrics,
    @Schema(description = "요약 하이라이트")
    List<String> highlights
) {

}
