package com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.projection;

public record StoreDistrictClosedTopTenProjection(
    String districtCode,
    String districtName,
    long closedStoreCount,
    double closureChangeRate
) {

}
