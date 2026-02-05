package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권의 요일별 유동인구 정보")
public record FootTrafficByDayOfWeekItem(

    @Schema(description = "월요일 유동인구 수", example = "15000")
    long mondayFootTraffic,

    @Schema(description = "화요일 유동인구 수", example = "24000")
    long tuesdayFootTraffic,

    @Schema(description = "수요일 유동인구 수", example = "32000")
    long wednesdayFootTraffic,

    @Schema(description = "목요일 유동인구 수", example = "48000")
    long thursdayFootTraffic,

    @Schema(description = "금요일 유동인구 수", example = "50000")
    long fridayFootTraffic,

    @Schema(description = "토요일 유동인구 수", example = "70000")
    long saturdayFootTraffic,

    @Schema(description = "일요일 유동인구 수", example = "53000")
    long sundayFootTraffic
) {

}