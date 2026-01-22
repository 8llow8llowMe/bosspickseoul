package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권의 연령대별 상주 인구 정보 DTO")
public record CommercialPopulationItem(

    @Schema(description = "상권 내 전체 상주 인구 수", example = "125000")
    long totalPopulation,

    @Schema(description = "10대 상주 인구 수", example = "12000")
    long teenPopulation,

    @Schema(description = "20대 상주 인구 수", example = "28000")
    long twentyPopulation,

    @Schema(description = "30대 상주 인구 수", example = "31000")
    long thirtyPopulation,

    @Schema(description = "40대 상주 인구 수", example = "27000")
    long fortyPopulation,

    @Schema(description = "50대 상주 인구 수", example = "19000")
    long fiftyPopulation,

    @Schema(description = "60대 이상 상주 인구 수", example = "11000")
    long sixtyPopulation
) {

}
