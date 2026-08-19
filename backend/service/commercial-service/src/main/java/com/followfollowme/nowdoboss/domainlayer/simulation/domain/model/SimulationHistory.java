package com.followfollowme.nowdoboss.domainlayer.simulation.domain.model;

import com.followfollowme.nowdoboss.domainlayer.simulation.domain.enums.SimulationFloorType;
import java.time.LocalDateTime;
import lombok.Builder;

/**
 * 회원별 시뮬레이션 결과 저장 이력. totalPrice 단위: 만원.
 */
@Builder
public record SimulationHistory(
    Long id,
    long memberId,
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
