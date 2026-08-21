package com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query;

import lombok.Builder;

@Builder
public record SalesAdministrationTopFiveQueryResult(
    String administrationCode,
    String administrationName,
    long totalSalesAmount,
    double salesChangeRate
) {

}
