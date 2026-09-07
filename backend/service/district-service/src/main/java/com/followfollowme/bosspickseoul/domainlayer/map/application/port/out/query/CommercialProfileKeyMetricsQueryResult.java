package com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query;

public record CommercialProfileKeyMetricsQueryResult(
    Double totalSalesAmount,
    Double totalFootTraffic,
    Long totalStoreCount,
    Long similarStoreCount,
    Double openingRate,
    Double closureRate,
    Long totalResidentPopulation,
    Long monthlyAverageIncomeAmount,
    Long totalFacilityCount
) {

}
