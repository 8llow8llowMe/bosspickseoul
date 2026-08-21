package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection;

public record FootTrafficDistrictTopTenProjection(
    String districtCode,
    String districtName,
    long totalFootTraffic,
    double footTrafficChangeRate
) {

}
