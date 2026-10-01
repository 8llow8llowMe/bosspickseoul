package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.common.constants.AnalysisPeriodDefaults;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item.CommercialResidentPopulationByAgeItem;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권의 상주인구 정보 조회 응답")
public record CommercialResidentPopulationResponse(

    @Schema(description = "실제로 조회한 기준 분기. 요청에서 periodCode 를 생략하면 서버가 정한 기본 분기(GET /api/v1/commercials/periods 의 defaultPeriodCode)", example = AnalysisPeriodDefaults.PERIOD_CODE)
    String periodCode,

    @Schema(description = "연령대별 상주인구")
    CommercialResidentPopulationByAgeItem byAgeItem,

    @Schema(description = "남성 비율 (%)", example = "48.3")
    double malePercentage,

    @Schema(description = "여성 비율 (%)", example = "51.7")
    double femalePercentage
) {

}
