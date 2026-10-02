package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "업종별 점포당 평균 매출 벤치마크(이슈 #485). 지수 100 이 비교 단위 평균과 같은 수준이다")
public record CommercialSalesPerStoreSummaryItem(

    @Schema(description = "서비스 업종 코드", example = "CS100010")
    String serviceCode,

    @Schema(description = "서비스 업종명", example = "커피-음료")
    String serviceName,

    @Schema(description = "자치구 점포당 월 매출")
    RegionalSalesPerStoreItem district,

    @Schema(description = "행정동 점포당 월 매출")
    RegionalSalesPerStoreItem administration,

    @Schema(description = "상권 점포당 월 매출")
    RegionalSalesPerStoreItem commercial,

    @Schema(
        description = "자치구 대비 지수 = 상권 점포당 월 매출 ÷ 자치구 점포당 월 매출 × 100, 소수 첫째 자리 반올림(HALF_UP). "
            + "어느 한쪽 점포당 매출이 null 이거나 자치구 값이 0 이면 0 이 아니라 null 이다",
        example = "43.3", nullable = true)
    Double indexVsDistrict,

    @Schema(
        description = "행정동 대비 지수 = 상권 점포당 월 매출 ÷ 행정동 점포당 월 매출 × 100, 소수 첫째 자리 반올림(HALF_UP). "
            + "어느 한쪽 점포당 매출이 null 이거나 행정동 값이 0 이면 0 이 아니라 null 이다",
        example = "63.4", nullable = true)
    Double indexVsAdministration
) {

}
