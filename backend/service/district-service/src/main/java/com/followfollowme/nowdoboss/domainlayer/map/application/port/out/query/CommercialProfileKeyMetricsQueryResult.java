package com.followfollowme.nowdoboss.domainlayer.map.application.port.out.query;

public record CommercialProfileKeyMetricsQueryResult(
    double totalSalesAmount,
    double totalFootTraffic,
    long totalStoreCount,
    long similarStoreCount,
    double openingRate,
    double closureRate,
    long totalResidentPopulation,
    long monthlyAverageIncomeAmount,
    long totalFacilityCount
) {

}
