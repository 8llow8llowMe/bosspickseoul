package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권&업종의 시간대별 매출건수 정보 DTO")
public record CommercialTimeSalesCountItem(

    @Schema(description = "새벽 시간대 (00:00 ~ 06:00) 매출건수", example = "5")
    long salesCount00,

    @Schema(description = "아침 시간대 (06:00 ~ 11:00) 매출건수", example = "10")
    long salesCount06,

    @Schema(description = "점심 시간대 (11:00 ~ 14:00) 매출건수", example = "20")
    long salesCount11,

    @Schema(description = "오후 시간대 (14:00 ~ 17:00) 매출건수", example = "50")
    long salesCount14,

    @Schema(description = "저녁 시간대 (17:00 ~ 21:00) 매출건수", example = "50")
    long salesCount17,

    @Schema(description = "밤 시간대 (21:00 ~ 24:00) 매출건수", example = "40")
    long salesCount21
) {

}
