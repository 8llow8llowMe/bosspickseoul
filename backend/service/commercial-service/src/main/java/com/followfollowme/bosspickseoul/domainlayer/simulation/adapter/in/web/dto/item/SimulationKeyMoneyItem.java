package com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "권리금 수준 항목 DTO")
public record SimulationKeyMoneyItem(

    @Schema(description = "권리금 유 비율 (%)", example = "75.4", nullable = true)
    Double keyMoneyRatio,

    @Schema(description = "권리금 수준 평균 (만원)", example = "5670")
    int keyMoneyAverage,

    @Schema(description = "권리금 수준 ㎡당 평균 (만원/㎡)", example = "75.3", nullable = true)
    Double keyMoneyLevel
) {

}
