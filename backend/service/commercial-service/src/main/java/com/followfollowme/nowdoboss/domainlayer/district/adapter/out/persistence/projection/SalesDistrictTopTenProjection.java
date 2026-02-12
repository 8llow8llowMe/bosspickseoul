package com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.projection;

public record SalesDistrictTopTenProjection(
    String districtCode,
    String districtName,
    long totalSalesAmount,
    double salesChangeRate
) {

}
