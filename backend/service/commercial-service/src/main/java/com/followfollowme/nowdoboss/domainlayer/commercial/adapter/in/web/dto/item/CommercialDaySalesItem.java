package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권&업종의 요일별 매출액 정보 DTO")
public record CommercialDaySalesItem(

    @Schema(description = "월요일 매출액", example = "150000")
    long monSales,

    @Schema(description = "화요일 매출액", example = "150000")
    long tueSales,

    @Schema(description = "수요일 매출액", example = "150000")
    long wedSales,

    @Schema(description = "목요일 매출액", example = "150000")
    long thuSales,

    @Schema(description = "금요일 매출액", example = "150000")
    long friSales,

    @Schema(description = "토요일 매출액", example = "150000")
    long satSales,

    @Schema(description = "일요일 매출액", example = "150000")
    long sunSales
) {

}
