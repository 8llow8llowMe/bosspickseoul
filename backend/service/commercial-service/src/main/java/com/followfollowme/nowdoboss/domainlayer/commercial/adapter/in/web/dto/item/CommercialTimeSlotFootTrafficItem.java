package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권의 시간대별 유동 인구 정보 DTO")
public record CommercialTimeSlotFootTrafficItem(

    @Schema(description = "새벽 시간대 (00:00 ~ 06:00)의 유동 인구 수", example = "1500")
    long footTraffic00,

    @Schema(description = "아침 시간대 (06:00 ~ 11:00)의 유동 인구 수", example = "3200")
    long footTraffic06,

    @Schema(description = "점심 시간대 (11:00 ~ 14:00)의 유동 인구 수", example = "4800")
    long footTraffic11,

    @Schema(description = "오후 시간대 (14:00 ~ 17:00)의 유동 인구 수", example = "3900")
    long footTraffic14,

    @Schema(description = "저녁 시간대 (17:00 ~ 21:00)의 유동 인구 수", example = "5200")
    long footTraffic17,

    @Schema(description = "밤 시간대 (21:00 ~ 24:00)의 유동 인구 수", example = "2100")
    long footTraffic21
) {

}
