package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권 내 가구 월 평균 소득 정보")
public record CommercialAverageIncomeItem(

    @Schema(description = "월 평균 소득 금액", example = "4200000")
    long monthlyAverageIncomeAmount,

    @Schema(description = "소득 구간 코드 (1 ~ 10)", example = "5")
    int incomeBracketCode
) {

}
