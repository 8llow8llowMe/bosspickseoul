package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "후보 상권 프로필 핵심 지표 항목 DTO — 해당 분기 데이터가 없는 지표는 null 로 내려간다")
public record CommercialProfileKeyMetricsItem(

    @Schema(description = "총 매출액", nullable = true)
    Double totalSalesAmount,

    @Schema(description = "총 유동인구", nullable = true)
    Double totalFootTraffic,

    @Schema(description = "총 점포 수", nullable = true)
    Long totalStoreCount,

    @Schema(description = "유사 업종 점포 수", nullable = true)
    Long similarStoreCount,

    @Schema(description = "개업률", nullable = true)
    Double openingRate,

    @Schema(description = "폐업률", nullable = true)
    Double closureRate,

    @Schema(description = "총 거주인구", nullable = true)
    Long totalResidentPopulation,

    @Schema(description = "월 평균 소득", nullable = true)
    Long monthlyAverageIncomeAmount,

    @Schema(description = "총 주요 시설 수", nullable = true)
    Long totalFacilityCount,

    @Schema(description = "매출 피크 시간대 (예: 17시~21시)", nullable = true)
    String peakSalesTimeSlot,

    @Schema(description = "유동인구 피크 시간대 (예: 11시~14시)", nullable = true)
    String peakFootTrafficTimeSlot,

    @Schema(description = "매출 주 연령대 (예: 30대)", nullable = true)
    String dominantSalesAgeGroup
) {

}
