package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.profile;

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
    Long totalFacilityCount,
    String peakSalesTimeSlot,
    String peakFootTrafficTimeSlot,
    String dominantSalesAgeGroup
) {

}
