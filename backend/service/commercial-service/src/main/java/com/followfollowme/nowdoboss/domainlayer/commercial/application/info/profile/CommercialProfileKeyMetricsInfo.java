package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.profile;

import lombok.Builder;

@Builder
public record CommercialProfileKeyMetricsInfo(
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
