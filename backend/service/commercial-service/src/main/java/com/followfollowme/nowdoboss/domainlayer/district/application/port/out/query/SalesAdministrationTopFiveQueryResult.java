package com.followfollowme.nowdoboss.domainlayer.district.application.port.out.query;

import lombok.Builder;

@Builder
public record SalesAdministrationTopFiveQueryResult(
    String administrationCode,
    String administrationName,
    long totalSalesAmount,
    double salesChangeRate
) {

}
