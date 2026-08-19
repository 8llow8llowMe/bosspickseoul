package com.followfollowme.nowdoboss.domainlayer.simulation.application.command;

import com.followfollowme.nowdoboss.domainlayer.simulation.domain.enums.SimulationFloorType;
import lombok.Builder;

@Builder
public record SimulationReportCommand(
    boolean franchisee,
    Long franchiseeId,
    String districtCode,
    String serviceCode,
    int storeSize,
    SimulationFloorType floorType,
    String periodCode
) {

}
