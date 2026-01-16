package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권&업종의 연령대별 및 성별별 매출액 비율 정보 DTO")
public record CommercialAgeGenderPercentSalesItem(

    @Schema(description = "10대 남성의 매출액 비율", example = "0.2")
    double maleTeenSalesPercent,

    @Schema(description = "10대 여성의 매출액 비율", example = "0.2")
    double femaleTeenSalesPercent,

    @Schema(description = "20대 남성의 매출액 비율", example = "0.2")
    double maleTwentySalesPercent,

    @Schema(description = "20대 여성의 매출액 비율", example = "0.2")
    double femaleTwentySalesPercent,

    @Schema(description = "30대 남성의 매출액 비율", example = "0.2")
    double maleThirtySalesPercent,

    @Schema(description = "30대 여성의 매출액 비율", example = "0.2")
    double femaleThirtySalesPercent,

    @Schema(description = "40대 남성의 매출액 비율", example = "0.2")
    double maleFortySalesPercent,

    @Schema(description = "40대 여성의 매출액 비율", example = "0.2")
    double femaleFortySalesPercent,

    @Schema(description = "50대 남성의 매출액 비율", example = "0.2")
    double maleFiftySalesPercent,

    @Schema(description = "50대 여성의 매출액 비율", example = "0.2")
    double femaleFiftySalesPercent,

    @Schema(description = "60대 이상 남성의 매출액 비율", example = "0.2")
    double maleSixtySalesPercent,

    @Schema(description = "60대 이상 여성의 매출액 비율", example = "0.2")
    double femaleSixtySalesPercent
) {

}
