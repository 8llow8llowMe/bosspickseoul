package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권&업종의 연령대별 및 성별 매출액 비율 정보")
public record CommercialSalesByAgeGenderPercentItem(

    @Schema(description = "10대 남성 매출액 비율", example = "0.2")
    double maleAge10Percent,

    @Schema(description = "10대 여성 매출액 비율", example = "0.2")
    double femaleAge10Percent,

    @Schema(description = "20대 남성 매출액 비율", example = "0.2")
    double maleAge20Percent,

    @Schema(description = "20대 여성 매출액 비율", example = "0.2")
    double femaleAge20Percent,

    @Schema(description = "30대 남성 매출액 비율", example = "0.2")
    double maleAge30Percent,

    @Schema(description = "30대 여성 매출액 비율", example = "0.2")
    double femaleAge30Percent,

    @Schema(description = "40대 남성 매출액 비율", example = "0.2")
    double maleAge40Percent,

    @Schema(description = "40대 여성 매출액 비율", example = "0.2")
    double femaleAge40Percent,

    @Schema(description = "50대 남성 매출액 비율", example = "0.2")
    double maleAge50Percent,

    @Schema(description = "50대 여성 매출액 비율", example = "0.2")
    double femaleAge50Percent,

    @Schema(description = "60대 이상 남성 매출액 비율", example = "0.2")
    double maleAge60PlusPercent,

    @Schema(description = "60대 이상 여성 매출액 비율", example = "0.2")
    double femaleAge60PlusPercent
) {

}
