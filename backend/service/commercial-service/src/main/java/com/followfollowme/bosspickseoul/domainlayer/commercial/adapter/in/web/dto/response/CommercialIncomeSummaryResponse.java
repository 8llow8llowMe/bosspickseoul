package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item.RegionalIncomeSummaryItem;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "자치구/행정동/상권 지출 요약 응답")
public record CommercialIncomeSummaryResponse(

    @Schema(description = "자치구 지출 요약. 해당 분기에 행이 없는 지역 단위는 null 이다", nullable = true)
    RegionalIncomeSummaryItem district,

    @Schema(description = "행정동 지출 요약. 해당 분기에 행이 없는 지역 단위는 null 이다", nullable = true)
    RegionalIncomeSummaryItem administration,

    @Schema(
        description = "상권 지출 요약. 해당 분기에 행이 없거나 원천이 지출을 제공하지 않으면 null 이다",
        nullable = true
    )
    RegionalIncomeSummaryItem commercial
) {

}
