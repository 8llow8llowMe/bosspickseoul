package com.followfollowme.nowdoboss.domainlayer.district.application.port.out.query;

import lombok.Builder;

@Builder
public record SalesDistrictTopTenQueryResult(
    String districtCode,
    String districtName,
    long totalSalesAmount,
    double salesChangeRate
) {

}
