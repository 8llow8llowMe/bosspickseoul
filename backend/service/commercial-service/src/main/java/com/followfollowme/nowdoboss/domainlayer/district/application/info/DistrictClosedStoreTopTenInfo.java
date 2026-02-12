package com.followfollowme.nowdoboss.domainlayer.district.application.info;

import lombok.Builder;

@Builder
public record DistrictClosedStoreTopTenInfo(
    String districtCode,
    String districtName,
    long closedStoreCount,
    double closureChangeRate
) {

}
