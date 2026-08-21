package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection;

public record SalesDistrictServiceTopFiveProjection(
    String serviceCode,
    String serviceName,
    double salesChangeRate
) {

}
