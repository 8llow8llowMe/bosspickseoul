package com.followfollowme.nowdoboss.domainlayer.district.application.info;

import lombok.Builder;

@Builder
public record DistrictFootTrafficTopTenInfo(
    String districtCode,
    String districtName,
    long totalFootTraffic,
    double footTrafficChangeRate
) {

}
