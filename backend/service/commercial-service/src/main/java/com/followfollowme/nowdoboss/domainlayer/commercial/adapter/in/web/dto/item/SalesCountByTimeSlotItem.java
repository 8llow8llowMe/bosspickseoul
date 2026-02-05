package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권&업종의 시간대별 매출건수 정보")
public record SalesCountByTimeSlotItem(

    @Schema(description = "00~06시 매출건수", example = "5")
    long salesCountTime00To06,

    @Schema(description = "06~11시 매출건수", example = "10")
    long salesCountTime06To11,

    @Schema(description = "11~14시 매출건수", example = "20")
    long salesCountTime11To14,

    @Schema(description = "14~17시 매출건수", example = "50")
    long salesCountTime14To17,

    @Schema(description = "17~21시 매출건수", example = "50")
    long salesCountTime17To21,

    @Schema(description = "21~24시 매출건수", example = "40")
    long salesCountTime21To24
) {

}