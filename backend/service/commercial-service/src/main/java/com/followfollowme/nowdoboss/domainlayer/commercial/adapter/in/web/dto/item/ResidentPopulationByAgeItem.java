package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권의 연령대별 상주인구 정보")
public record ResidentPopulationByAgeItem(

    @Schema(description = "총 상주인구 수", example = "125000")
    long totalResidentPopulation,

    @Schema(description = "10대 상주인구 수", example = "12000")
    long age10ResidentPopulation,

    @Schema(description = "20대 상주인구 수", example = "28000")
    long age20ResidentPopulation,

    @Schema(description = "30대 상주인구 수", example = "31000")
    long age30ResidentPopulation,

    @Schema(description = "40대 상주인구 수", example = "27000")
    long age40ResidentPopulation,

    @Schema(description = "50대 상주인구 수", example = "19000")
    long age50ResidentPopulation,

    @Schema(description = "60대 이상 상주인구 수", example = "11000")
    long age60PlusResidentPopulation
) {

}