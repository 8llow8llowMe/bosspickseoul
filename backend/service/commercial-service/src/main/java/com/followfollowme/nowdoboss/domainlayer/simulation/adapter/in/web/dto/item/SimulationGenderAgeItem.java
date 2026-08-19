package com.followfollowme.nowdoboss.domainlayer.simulation.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "성별·연령 매출 분석 항목 DTO")
public record SimulationGenderAgeItem(

    @Schema(description = "남성 매출 비중 (%)", example = "46.2")
    double malePercent,

    @Schema(description = "여성 매출 비중 (%)", example = "53.8")
    double femalePercent,

    @Schema(description = "매출 상위 연령대 Top 3")
    List<SimulationAgeSalesItem> topAgeGroups
) {

}
