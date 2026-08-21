package com.followfollowme.bosspickseoul.domainlayer.simulation.application.info;

import java.util.List;
import lombok.Builder;

@Builder
public record SimulationHistoryPageInfo(
    List<SimulationHistoryInfo> histories,
    int page,
    int size,
    long totalElements,
    int totalPages
) {

}
