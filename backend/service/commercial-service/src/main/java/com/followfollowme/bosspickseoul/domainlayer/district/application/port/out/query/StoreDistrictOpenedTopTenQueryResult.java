package com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query;

import lombok.Builder;

@Builder
public record StoreDistrictOpenedTopTenQueryResult(
    String districtCode,
    String districtName,
    long openedStoreCount,
    double openingChangeRate
) {

}
