package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
public record RegionalIncomeSummaryItem(

    @Schema(description = "코드")
    String code,

    @Schema(description = "이름")
    String name,

    @Schema(description = "총 지출액")
    long totalExpenseAmount
) {

}
