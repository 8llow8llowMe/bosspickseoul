package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권&업종의 요일별 매출액 정보")
public record CommercialSalesByDayOfWeekItem(

    @Schema(description = "월요일 매출액", example = "150000")
    long mondaySalesAmount,

    @Schema(description = "화요일 매출액", example = "150000")
    long tuesdaySalesAmount,

    @Schema(description = "수요일 매출액", example = "150000")
    long wednesdaySalesAmount,

    @Schema(description = "목요일 매출액", example = "150000")
    long thursdaySalesAmount,

    @Schema(description = "금요일 매출액", example = "150000")
    long fridaySalesAmount,

    @Schema(description = "토요일 매출액", example = "150000")
    long saturdaySalesAmount,

    @Schema(description = "일요일 매출액", example = "150000")
    long sundaySalesAmount
) {

}
