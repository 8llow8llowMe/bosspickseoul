package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.common.constants.AnalysisPeriodDefaults;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item.RegionalSalesSummaryItem;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "자치구/행정동/상권 매출 요약 응답")
public record CommercialSalesSummaryResponse(

    @Schema(description = "실제로 조회한 기준 분기. 요청에서 periodCode 를 생략하면 서버가 정한 기본 분기(GET /api/v1/commercials/periods 의 defaultPeriodCode)", example = AnalysisPeriodDefaults.PERIOD_CODE)
    String periodCode,

    @Schema(description = "자치구 매출 요약")
    RegionalSalesSummaryItem district,

    @Schema(description = "행정동 매출 요약")
    RegionalSalesSummaryItem administration,

    @Schema(description = "상권 매출 요약")
    RegionalSalesSummaryItem commercial
) {

}
