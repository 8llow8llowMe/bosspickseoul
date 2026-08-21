package com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.item.SimulationHistoryItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "저장된 시뮬레이션 이력 목록 응답 DTO")
public record SimulationHistoriesResponse(

    @Schema(description = "이력 목록 (최신순)")
    List<SimulationHistoryItem> histories,

    @Schema(description = "현재 페이지 (0부터)", example = "0")
    int page,

    @Schema(description = "페이지 크기", example = "10")
    int size,

    @Schema(description = "전체 건수", example = "23")
    long totalElements,

    @Schema(description = "전체 페이지 수", example = "3")
    int totalPages
) {

}
