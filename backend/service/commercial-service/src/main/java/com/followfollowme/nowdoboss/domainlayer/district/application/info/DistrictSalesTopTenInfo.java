package com.followfollowme.nowdoboss.domainlayer.district.application.info;

import lombok.Builder;

@Builder
public record DistrictSalesTopTenInfo(
    String districtCode,
    String districtName,
    long totalSalesAmount,
    double salesChangeRate
) {

}
