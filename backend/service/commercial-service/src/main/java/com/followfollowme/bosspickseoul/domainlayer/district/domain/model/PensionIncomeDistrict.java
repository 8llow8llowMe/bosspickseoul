package com.followfollowme.bosspickseoul.domainlayer.district.domain.model;

import java.time.LocalDate;
import lombok.Builder;

/**
 * 국민연금 지역가입자 신고 기준소득월액의 자치구 평균 한 기준일. (이슈 #415)
 *
 * <p>지역가입자(사업장 가입자가 아닌 18~60세 국내 거주자)의 신고값 평균이라 그 자치구 주민 전체나 상권의 소득이 아니다.
 * 적재 감사 컬럼(원문 시군구명·체크섬·run-id)은 조회가 쓰지 않아 담지 않는다.
 */
@Builder
public record PensionIncomeDistrict(
    long id,
    LocalDate referenceDate,
    String districtCode,
    String districtName,
    long averageMonthlyIncomeAmount
) {

}
