package com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "연령대별 매출 항목 DTO")
public record SimulationAgeSalesItem(

    @Schema(description = "연령대 이름", example = "20대")
    String ageGroupName,

    @Schema(description = "매출액 (만원)", example = "125000")
    long salesAmount
) {

}
