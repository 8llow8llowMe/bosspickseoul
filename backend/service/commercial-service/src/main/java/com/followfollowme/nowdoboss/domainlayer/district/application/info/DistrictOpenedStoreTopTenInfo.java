package com.followfollowme.nowdoboss.domainlayer.district.application.info;

import lombok.Builder;

@Builder
public record DistrictOpenedStoreTopTenInfo(
    String districtCode,
    String districtName,
    long openedStoreCount,
    double openingChangeRate
) {

}
