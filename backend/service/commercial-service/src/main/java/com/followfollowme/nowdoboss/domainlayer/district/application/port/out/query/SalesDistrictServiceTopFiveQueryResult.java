package com.followfollowme.nowdoboss.domainlayer.district.application.port.out.query;

import lombok.Builder;

@Builder
public record SalesDistrictServiceTopFiveQueryResult(
    String serviceCode,
    String serviceName,
    double salesChangeRate
) {

}
