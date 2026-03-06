package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
public record RegionalSalesSummaryItem(

    @Schema(description = "코드")
    String code,

    @Schema(description = "이름")
    String name,

    @Schema(description = "서비스 코드")
    String serviceCode,

    @Schema(description = "서비스명")
    String serviceName,

    @Schema(description = "월 매출 총액")
    long monthlySalesAmount
) {

}
