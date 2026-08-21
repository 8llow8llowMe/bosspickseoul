package com.followfollowme.bosspickseoul.domainlayer.simulation.domain.model;

import lombok.Builder;

/**
 * 자치구별 임대료 기준. 금액 단위: 3.3㎡당 월환산임대료(원).
 */
@Builder
public record SimulationRent(
    long id,
    String baseYear,
    String districtCode,
    String districtName,
    int firstFloorRent,
    int otherFloorRent,
    int totalRent
) {

}
