package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권의 연령대별 및 성별대 유동 인구 비율 정보 DTO")
public record CommercialAgeGenderPercentFootTrafficItem(

    @Schema(description = "10대 남성의 유동 인구 비율", example = "0.12")
    double maleTeenFootTrafficPercent,

    @Schema(description = "10대 여성의 유동 인구 비율", example = "0.12")
    double femaleTeenFootTrafficPercent,

    @Schema(description = "20대 남성의 유동 인구 비율", example = "0.21")
    double maleTwentyFootTrafficPercent,

    @Schema(description = "20대 여성의 유동 인구 비율", example = "0.24")
    double femaleTwentyFootTrafficPercent,

    @Schema(description = "30대 남성의 유동 인구 비율", example = "0.30")
    double maleThirtyFootTrafficPercent,

    @Schema(description = "30대 여성의 유동 인구 비율", example = "0.31")
    double femaleThirtyFootTrafficPercent,

    @Schema(description = "40대 남성의 유동 인구 비율", example = "0.37")
    double maleFortyFootTrafficPercent,

    @Schema(description = "40대 여성의 유동 인구 비율", example = "0.37")
    double femaleFortyFootTrafficPercent,

    @Schema(description = "50대 남성의 유동 인구 비율", example = "0.40")
    double maleFiftyFootTrafficPercent,

    @Schema(description = "50대 여성의 유동 인구 비율", example = "0.40")
    double femaleFiftyFootTrafficPercent,

    @Schema(description = "60대 이상 남성의 유동 인구 비율", example = "0.50")
    double maleSixtyFootTrafficPercent,

    @Schema(description = "60대 이상 여성의 유동 인구 비율", example = "0.50")
    double femaleSixtyFootTrafficPercent
) {

}
