package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item.RegionalSalesSummaryItem;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "자치구/행정동/상권 매출 요약 응답")
public record CommercialSalesSummaryResponse(

    @Schema(description = "자치구 매출 요약")
    RegionalSalesSummaryItem district,

    @Schema(description = "행정동 매출 요약")
    RegionalSalesSummaryItem administration,

    @Schema(description = "상권 매출 요약")
    RegionalSalesSummaryItem commercial
) {

}
