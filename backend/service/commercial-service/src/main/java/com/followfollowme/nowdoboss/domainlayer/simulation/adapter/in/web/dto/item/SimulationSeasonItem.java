package com.followfollowme.nowdoboss.domainlayer.simulation.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "성수기/비성수기 분석 항목 DTO")
public record SimulationSeasonItem(

    @Schema(description = "성수기 월 목록", example = "[7, 8, 9]")
    List<Integer> peakMonths,

    @Schema(description = "비성수기 월 목록", example = "[1, 2, 3]")
    List<Integer> offPeakMonths
) {

}
