package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income;

import lombok.Builder;

/**
 * {@code GET /commercials/{code}/income} 한 응답분. 소비와 자치구 평균 소득(대체)을 함께 든다. (이슈 #415)
 *
 * <p>소득을 {@link CommercialIncomeAndExpenseInfo} 에 넣지 않은 이유는 그 Info 를 요약·비교도 「소비 한 벌」로 쓰기 때문이다.
 * 거기에 소득이 붙으면 소득 대체값을 싣지 말아야 할 비교 경로까지 그 값을 들고 다니게 된다.
 */
@Builder
public record CommercialIncomeAndExpenseResponseInfo(
    CommercialIncomeAndExpenseInfo expense,
    CommercialDistrictAverageIncomeInfo districtAverageIncome
) {

}
