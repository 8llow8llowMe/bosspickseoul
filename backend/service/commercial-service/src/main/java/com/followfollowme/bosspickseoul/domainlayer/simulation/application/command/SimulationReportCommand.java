package com.followfollowme.bosspickseoul.domainlayer.simulation.application.command;

import com.followfollowme.bosspickseoul.domainlayer.simulation.domain.enums.SimulationFloorType;
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
