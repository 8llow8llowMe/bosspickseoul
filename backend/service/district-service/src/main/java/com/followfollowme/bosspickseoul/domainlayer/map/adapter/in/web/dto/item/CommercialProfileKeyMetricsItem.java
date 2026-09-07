package com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.item;

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
    Long totalFacilityCount
) {

}
