package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection;

public record StoreDistrictOpenedTopTenProjection(
    String districtCode,
    String districtName,
    long openedStoreCount,
    double openingChangeRate
) {

}
