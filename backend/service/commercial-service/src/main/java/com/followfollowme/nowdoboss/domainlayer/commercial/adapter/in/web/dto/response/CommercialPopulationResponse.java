package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item.CommercialPopulationItem;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권의 상주 인구 정보 조회 응답 DTO")
public record CommercialPopulationResponse(

    @Schema(description = "상권 내 연령대별 상주 인구 정보")
    CommercialPopulationItem populationItem,

    @Schema(description = "상권 전체 상주 인구 중 남성 비율 (%)", example = "48.3")
    double malePercentage,

    @Schema(description = "상권 전체 상주 인구 중 여성 비율 (%)", example = "51.7")
    double femalePercentage
) {

}
