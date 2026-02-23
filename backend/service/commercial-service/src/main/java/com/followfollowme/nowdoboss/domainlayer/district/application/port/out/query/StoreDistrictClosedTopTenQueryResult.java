package com.followfollowme.nowdoboss.domainlayer.district.application.port.out.query;

import lombok.Builder;

@Builder
public record StoreDistrictClosedTopTenQueryResult(
    String districtCode,
    String districtName,
    long closedStoreCount,
    double closureChangeRate
) {

}
