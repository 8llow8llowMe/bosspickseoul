package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권&업종의 연령대별 매출액 정보")
public record CommercialSalesByAgeItem(

    @Schema(description = "10대 매출액", example = "150000")
    long age10SalesAmount,

    @Schema(description = "20대 매출액", example = "150000")
    long age20SalesAmount,

    @Schema(description = "30대 매출액", example = "150000")
    long age30SalesAmount,

    @Schema(description = "40대 매출액", example = "150000")
    long age40SalesAmount,

    @Schema(description = "50대 매출액", example = "150000")
    long age50SalesAmount,

    @Schema(description = "60대 이상 매출액", example = "150000")
    long age60PlusSalesAmount
) {

}
