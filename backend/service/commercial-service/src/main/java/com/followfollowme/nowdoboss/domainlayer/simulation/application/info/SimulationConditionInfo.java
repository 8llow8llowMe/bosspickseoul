package com.followfollowme.nowdoboss.domainlayer.simulation.application.info;

import com.followfollowme.nowdoboss.domainlayer.simulation.domain.enums.SimulationFloorType;
import lombok.Builder;

@Builder
public record SimulationConditionInfo(
    boolean franchisee,
    Long franchiseeId,
    String brandName,
    String districtCode,
    String districtName,
    String serviceCode,
    String serviceName,
    int storeSize,
    SimulationFloorType floorType,
    String periodCode
) {

}
