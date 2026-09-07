package com.followfollowme.bosspickseoul.domainlayer.map.application.info;

import lombok.Builder;

@Builder
public record CommercialProfileKeyMetricsInfo(
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
