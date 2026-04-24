package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "후보 상권 프로필 핵심 지표 항목 DTO")
public record CommercialProfileKeyMetricsItem(

    @Schema(description = "총 매출액")
    double totalSalesAmount,

    @Schema(description = "총 유동인구")
    double totalFootTraffic,

    @Schema(description = "총 점포 수")
    long totalStoreCount,

    @Schema(description = "유사 업종 점포 수")
    long similarStoreCount,

    @Schema(description = "개업률")
    double openingRate,

    @Schema(description = "폐업률")
    double closureRate,

    @Schema(description = "총 거주인구")
    long totalResidentPopulation,

    @Schema(description = "월 평균 소득")
    long monthlyAverageIncomeAmount,

    @Schema(description = "총 주요 시설 수")
    long totalFacilityCount,

    @Schema(description = "매출 피크 시간대 (예: 17시~21시)")
    String peakSalesTimeSlot,

    @Schema(description = "유동인구 피크 시간대 (예: 11시~14시)")
    String peakFootTrafficTimeSlot,

    @Schema(description = "매출 주 연령대 (예: 30대)")
    String dominantSalesAgeGroup
) {

}
