package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.projection;

public record SalesAdministrationTopFiveProjection(
    String administrationCode,
    String administrationName,
    long totalSalesAmount,
    double salesChangeRate
) {

}
