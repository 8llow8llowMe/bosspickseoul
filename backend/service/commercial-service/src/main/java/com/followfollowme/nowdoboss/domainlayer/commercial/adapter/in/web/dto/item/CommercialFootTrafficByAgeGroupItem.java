package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "상권의 연령대별 유동인구 정보")
public record CommercialFootTrafficByAgeGroupItem(

    @Schema(description = "10대 유동인구 수", example = "15000")
    long age10FootTraffic,

    @Schema(description = "20대 유동인구 수", example = "32000")
    long age20FootTraffic,

    @Schema(description = "30대 유동인구 수", example = "58000")
    long age30FootTraffic,

    @Schema(description = "40대 유동인구 수", example = "80000")
    long age40FootTraffic,

    @Schema(description = "50대 유동인구 수", example = "100000")
    long age50FootTraffic,

    @Schema(description = "60대 이상 유동인구 수", example = "180000")
    long age60PlusFootTraffic
) {

}
