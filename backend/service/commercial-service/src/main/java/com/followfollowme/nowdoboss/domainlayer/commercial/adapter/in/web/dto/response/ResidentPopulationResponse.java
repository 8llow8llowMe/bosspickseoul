package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.ResidentPopulationByAgeItem;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권의 상주인구 정보 조회 응답")
public record ResidentPopulationResponse(

    @Schema(description = "연령대별 상주인구")
    ResidentPopulationByAgeItem byAgeItem,

    @Schema(description = "남성 비율 (%)", example = "48.3")
    double malePercentage,

    @Schema(description = "여성 비율 (%)", example = "51.7")
    double femalePercentage
) {

}