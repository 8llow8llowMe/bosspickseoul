package com.followfollowme.nowdoboss.domainlayer.aireport.application.model;

import java.util.List;
import lombok.Builder;

@Builder
public record DistrictAiSourceData(
    String districtCode,
    String districtName,
    String periodCode,
    String changeIndicatorName,
    String averageOpenedMonths,
    String averageClosedMonths,
    String footTrafficTrend,
    String dominantTimeSlot,
    String dominantGender,
    List<String> topStoreServiceSummaries,
    List<String> topOpenedAdministrationSummaries,
    List<String> topClosedAdministrationSummaries,
    List<String> topSalesServiceSummaries,
    List<String> topSalesAdministrationSummaries
) {
}
