package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권의 연령대별 및 성별 유동인구 비율 정보")
public record FootTrafficByAgeGenderPercentItem(

    @Schema(description = "10대 남성 유동인구 비율", example = "0.12")
    double maleAge10Percent,

    @Schema(description = "10대 여성 유동인구 비율", example = "0.12")
    double femaleAge10Percent,

    @Schema(description = "20대 남성 유동인구 비율", example = "0.21")
    double maleAge20Percent,

    @Schema(description = "20대 여성 유동인구 비율", example = "0.24")
    double femaleAge20Percent,

    @Schema(description = "30대 남성 유동인구 비율", example = "0.30")
    double maleAge30Percent,

    @Schema(description = "30대 여성 유동인구 비율", example = "0.31")
    double femaleAge30Percent,

    @Schema(description = "40대 남성 유동인구 비율", example = "0.37")
    double maleAge40Percent,

    @Schema(description = "40대 여성 유동인구 비율", example = "0.37")
    double femaleAge40Percent,

    @Schema(description = "50대 남성 유동인구 비율", example = "0.40")
    double maleAge50Percent,

    @Schema(description = "50대 여성 유동인구 비율", example = "0.40")
    double femaleAge50Percent,

    @Schema(description = "60대 이상 남성 유동인구 비율", example = "0.50")
    double maleAge60PlusPercent,

    @Schema(description = "60대 이상 여성 유동인구 비율", example = "0.50")
    double femaleAge60PlusPercent
) {

}