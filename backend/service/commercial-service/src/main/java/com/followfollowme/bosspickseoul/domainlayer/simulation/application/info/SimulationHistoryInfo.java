package com.followfollowme.bosspickseoul.domainlayer.simulation.application.info;

import com.followfollowme.bosspickseoul.domainlayer.simulation.domain.enums.SimulationFloorType;
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
    String dataBaseYear,
    LocalDateTime createdAt
) {

}
