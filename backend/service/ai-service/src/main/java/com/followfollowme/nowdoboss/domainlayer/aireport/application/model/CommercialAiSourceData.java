package com.followfollowme.nowdoboss.domainlayer.aireport.application.model;

import java.util.List;
import lombok.Builder;

@Builder
public record CommercialAiSourceData(
    String commercialCode,
    String serviceCode,
    String periodCode,
    String districtCode,
    String districtName,
    String administrationCode,
    String administrationName,
    String peakFootTrafficTimeSlot,
    String peakFootTrafficDayOfWeek,
    String peakFootTrafficAgeGroup,
    String peakSalesTimeSlot,
    String peakSalesDayOfWeek,
    String peakSalesAgeGroup,
    String largestAgeGenderShare,
    long totalFacilityCount,
    long schoolCount,
    long transportationFacilityCount,
    long totalResidentPopulationCount,
    String largestResidentAgeGroup,
    long averageMonthlyIncomeAmount,
    String largestExpenseCategory,
    long totalStoreCount,
    long similarStoreCount,
    long openedStoreCount,
    double openingRate,
    long closedStoreCount,
    double closureRate,
    long franchiseStoreCount,
    List<String> peerStoreSummaries,
    long districtSalesAmount,
    long administrationSalesAmount,
    long commercialSalesAmount,
    long districtExpenseAmount,
    long administrationExpenseAmount,
    long commercialExpenseAmount
) {
}
