package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권의 시간대별 유동인구 정보")
public record FootTrafficByTimeSlotItem(

    @Schema(description = "00~06시 유동인구 수", example = "1500")
    long footTrafficTime00To06,

    @Schema(description = "06~11시 유동인구 수", example = "3200")
    long footTrafficTime06To11,

    @Schema(description = "11~14시 유동인구 수", example = "4800")
    long footTrafficTime11To14,

    @Schema(description = "14~17시 유동인구 수", example = "3900")
    long footTrafficTime14To17,

    @Schema(description = "17~21시 유동인구 수", example = "5200")
    long footTrafficTime17To21,

    @Schema(description = "21~24시 유동인구 수", example = "2100")
    long footTrafficTime21To24
) {

}