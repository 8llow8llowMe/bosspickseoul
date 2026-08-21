package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item.RegionalIncomeSummaryItem;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "자치구/행정동/상권 지출 요약 응답")
public record CommercialIncomeSummaryResponse(

    @Schema(description = "자치구 지출 요약")
    RegionalIncomeSummaryItem district,

    @Schema(description = "행정동 지출 요약")
    RegionalIncomeSummaryItem administration,

    @Schema(description = "상권 지출 요약")
    RegionalIncomeSummaryItem commercial
) {

}
