package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권&업종의 나이대별 매출액 정보 DTO")
public record CommercialAgeSalesItem(

    @Schema(description = "10대 매출액", example = "150000")
    long teenSales,

    @Schema(description = "20대 매출액", example = "150000")
    long twentySales,

    @Schema(description = "30대 매출액", example = "150000")
    long thirtySales,

    @Schema(description = "40대 매출액", example = "150000")
    long fortySales,

    @Schema(description = "50대 매출액", example = "150000")
    long fiftySales,

    @Schema(description = "60대 매출액", example = "150000")
    long sixtySales
) {

}
