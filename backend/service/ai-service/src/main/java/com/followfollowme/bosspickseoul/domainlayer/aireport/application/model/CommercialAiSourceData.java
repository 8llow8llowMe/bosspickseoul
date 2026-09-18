package com.followfollowme.bosspickseoul.domainlayer.aireport.application.model;

import java.util.List;
import lombok.Builder;

/**
 * 원천이 상권 단위 소득 제공을 중단해 월 평균 소득 항목을 걷어냈고, 지출은 값이 없는 분기가 있어
 * 결측을 표현할 수 있는 타입으로 둔다(문자열 항목은 "N/A", 금액은 Wrapper 로 null). (이슈 #413)
 *
 * <p>지출 항목은 스코프마다 구성이 달라(상권 9개 / 행정동 대체 10개) 배열로 든다. 값이 소속 행정동에서 온
 * 대체치일 수 있으므로 출처({@code expenseProvenance})와 요약 상권 leg 의 출처
 * ({@code commercialExpenseProvenance})를 함께 실어, 프롬프트가 그 사실을 LLM 에 전달한다. (이슈 #415)
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
    List<CommercialAiExpenseCategory> expenseCategories,
    Long totalExpenseAmount,
    CommercialAiExpenseProvenance expenseProvenance,
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
    Long commercialExpenseAmount,
    CommercialAiExpenseProvenance commercialExpenseProvenance
) {
}
