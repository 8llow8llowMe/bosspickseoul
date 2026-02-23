package com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.projection;

public record SalesDistrictServiceTopFiveProjection(
    String serviceCode,
    String serviceName,
    double salesChangeRate
) {

}
