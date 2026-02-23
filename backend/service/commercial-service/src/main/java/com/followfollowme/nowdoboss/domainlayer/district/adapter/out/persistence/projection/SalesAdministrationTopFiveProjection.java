package com.followfollowme.nowdoboss.domainlayer.district.adapter.out.persistence.projection;

public record SalesAdministrationTopFiveProjection(
    String administrationCode,
    String administrationName,
    long totalSalesAmount,
    double salesChangeRate
) {

}
