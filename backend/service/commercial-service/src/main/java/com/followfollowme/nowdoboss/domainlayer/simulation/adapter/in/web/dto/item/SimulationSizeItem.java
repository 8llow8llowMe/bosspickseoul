package com.followfollowme.nowdoboss.domainlayer.simulation.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "매장 크기 항목 DTO")
public record SimulationSizeItem(

    @Schema(description = "면적 (㎡)", example = "66")
    int squareMeter,

    @Schema(description = "평 환산", example = "19")
    int pyeong
) {

}
