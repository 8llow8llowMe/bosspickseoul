package com.followfollowme.nowdoboss.domainlayer.simulation.adapter.in.web.dto.response;

import com.followfollowme.nowdoboss.domainlayer.simulation.adapter.in.web.dto.item.SimulationHistoryItem;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "시뮬레이션 결과 저장 응답 DTO")
public record SimulationHistorySaveResponse(

    @Schema(description = "저장된 시뮬레이션 이력")
    SimulationHistoryItem history
) {

}
