package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

import java.time.LocalDate;

/**
 * {@code pension_income_district} 한 행. 자치구 코드·이름은 공간 스냅샷의 정규 값이고, 원문 이름은 따로 남긴다.
 *
 * @param referenceDate 원천 기준년월의 말일
 */
public record PensionIncomeDistrictRow(LocalDate referenceDate, String districtCode, String districtName,
                                       String sourceRegionName, long averageMonthlyIncomeAmount) {
}
