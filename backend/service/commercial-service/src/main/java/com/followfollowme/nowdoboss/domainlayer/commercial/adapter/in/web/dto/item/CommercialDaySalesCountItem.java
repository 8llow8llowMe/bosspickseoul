package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권&업종의 요일별 매출건수 정보 DTO")
public record CommercialDaySalesCountItem(

    @Schema(description = "월요일 매출건수", example = "200")
    long monSalesCount,

    @Schema(description = "화요일 매출건수", example = "200")
    long tueSalesCount,

    @Schema(description = "수요일 매출액", example = "200")
    long wedSalesCount,

    @Schema(description = "목요일 매출액", example = "200")
    long thuSalesCount,

    @Schema(description = "금요일 매출액", example = "200")
    long friSalesCount,

    @Schema(description = "토요일 매출건수", example = "200")
    long satSalesCount,

    @Schema(description = "일요일 매출건수", example = "200")
    long sunSalesCount
) {

}
