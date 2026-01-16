package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권의 요일별 유동 인구 정보 DTO")
public record CommercialDayOfWeekFootTrafficItem(

    @Schema(description = "월요일의 유동 인구 수", example = "15000")
    long monFootTraffic,

    @Schema(description = "화요일의 유동 인구 수", example = "24000")
    long tueFootTraffic,

    @Schema(description = "수요일의 유동 인구 수", example = "32000")
    long wedFootTraffic,

    @Schema(description = "목요일의 유동 인구 수", example = "48000")
    long thuFootTraffic,

    @Schema(description = "금요일의 유동 인구 수", example = "50000")
    long friFootTraffic,

    @Schema(description = "토요일의 유동 인구 수", example = "70000")
    long satFootTraffic,

    @Schema(description = "일요일의 유동 인구 수", example = "53000")
    long sunFootTraffic
) {

}
