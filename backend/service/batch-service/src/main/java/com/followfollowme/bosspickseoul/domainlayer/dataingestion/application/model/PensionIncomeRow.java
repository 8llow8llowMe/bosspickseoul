package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

import java.time.YearMonth;

/**
 * 형식 검증을 통과한 원천 한 행. 아직 서울 여부·자치구 대조 전이다.
 *
 * @param rowNumber        원천 행 번호. 중복 보고에 쓴다
 * @param sourceRegionName 원문 시군구 이름({@code 서울특별시종로구})
 * @param amount           평균소득월액(원). 0 보다 크다
 */
public record PensionIncomeRow(long rowNumber, YearMonth referenceMonth, String sourceRegionName, long amount) {
}
