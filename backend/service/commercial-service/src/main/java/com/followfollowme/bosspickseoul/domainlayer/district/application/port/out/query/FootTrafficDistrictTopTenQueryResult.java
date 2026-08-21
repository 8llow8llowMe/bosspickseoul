package com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query;

import lombok.Builder;

@Builder
public record FootTrafficDistrictTopTenQueryResult(
    String districtCode,
    String districtName,
    long totalFootTraffic,
    double footTrafficChangeRate
) {

}
