package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권&업종의 요일별 매출건수 정보")
public record SalesCountByDayOfWeekItem(

    @Schema(description = "월요일 매출건수", example = "200")
    long mondaySalesCount,

    @Schema(description = "화요일 매출건수", example = "200")
    long tuesdaySalesCount,

    @Schema(description = "수요일 매출건수", example = "200")
    long wednesdaySalesCount,

    @Schema(description = "목요일 매출건수", example = "200")
    long thursdaySalesCount,

    @Schema(description = "금요일 매출건수", example = "200")
    long fridaySalesCount,

    @Schema(description = "토요일 매출건수", example = "200")
    long saturdaySalesCount,

    @Schema(description = "일요일 매출건수", example = "200")
    long sundaySalesCount
) {

}