package com.followfollowme.nowdoboss.domainlayer.simulation.application.info;

import lombok.Builder;

@Builder
public record SimulationStoreSizeInfo(
    String serviceCode,
    String serviceName,
    String dataBaseYear,
    SimulationSizeInfo small,
    SimulationSizeInfo medium,
    SimulationSizeInfo large
) {

}
