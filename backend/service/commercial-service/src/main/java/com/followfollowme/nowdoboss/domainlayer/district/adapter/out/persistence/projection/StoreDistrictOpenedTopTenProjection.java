package com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.projection;

public record StoreDistrictOpenedTopTenProjection(
    String districtCode,
    String districtName,
    long openedStoreCount,
    double openingChangeRate
) {

}
