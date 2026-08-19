package com.followfollowme.nowdoboss.domainlayer.simulation.application.port.out.query;

import com.followfollowme.nowdoboss.domainlayer.simulation.domain.model.SimulationHistory;
import java.util.List;
import lombok.Builder;

@Builder
public record SimulationHistoryPageQueryResult(
    List<SimulationHistory> histories,
    int page,
    int size,
    long totalElements,
    int totalPages
) {

}
