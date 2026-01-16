package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권의 연령대별 유동 인구 정보 DTO")
public record CommercialAgeGroupFootTrafficItem(

    @Schema(description = "10대의 유동 인구 수", example = "15000")
    long teenFootTraffic,

    @Schema(description = "20대의 유동 인구 수", example = "32000")
    long twentyFootTraffic,

    @Schema(description = "30대의 유동 인구 수", example = "58000")
    long thirtyFootTraffic,

    @Schema(description = "40대의 유동 인구 수", example = "80000")
    long fortyFootTraffic,

    @Schema(description = "50대의 유동 인구 수", example = "100000")
    long fiftyFootTraffic,

    @Schema(description = "60대 이상의 유동 인구 수", example = "180000")
    long sixtyFootTraffic
) {

}
