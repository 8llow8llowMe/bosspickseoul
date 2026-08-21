package com.followfollowme.bosspickseoul.domainlayer.district.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "분기별 유동인구 추이 항목")
public record DistrictPeriodFootTrafficItem(
    @Schema(description = "기준 분기 코드", example = "20233")
    String periodCode,

    @Schema(description = "해당 분기의 총 유동인구", example = "5847230")
    long totalFootTraffic
) {

}
