package com.followfollowme.nowdoboss.domainlayer.simulation.application.info;

import com.followfollowme.nowdoboss.domainlayer.simulation.domain.enums.SimulationFloorType;
import java.time.LocalDateTime;
import lombok.Builder;

@Builder
public record SimulationHistoryInfo(
    long historyId,
    boolean franchisee,
    String brandName,
    String districtCode,
    String districtName,
    String serviceCode,
    String serviceName,
    int storeSize,
    SimulationFloorType floorType,
    long totalPrice,
    LocalDateTime createdAt
) {

}
