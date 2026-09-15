package com.followfollowme.bosspickseoul.domainlayer.aireport.application.model;

import java.util.List;
import lombok.Builder;

/**
 * 원천이 상권 단위 소득 제공을 중단해 월 평균 소득 항목을 걷어냈고, 지출은 값이 없는 분기가 있어
 * 결측을 표현할 수 있는 타입으로 둔다(문자열 항목은 "N/A", 금액은 Wrapper 로 null). (이슈 #413)
 */
@Builder
public record CommercialAiSourceData(
    String commercialCode,
    String commercialName,
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
    Long districtExpenseAmount,
    Long administrationExpenseAmount,
    Long commercialExpenseAmount
) {
}
