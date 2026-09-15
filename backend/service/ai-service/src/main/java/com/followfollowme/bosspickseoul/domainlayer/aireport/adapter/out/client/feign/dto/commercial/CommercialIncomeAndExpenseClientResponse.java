package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * {@code GET /api/v1/commercials/{commercialCode}/income} 응답 본문의 wire 표현.
 *
 * <p>{@code ...Item} alias 를 아는 책임은 이 어댑터 계층 타입에만 있다.
 *
 * <p>원천이 상권 단위 월 평균 소득 제공을 중단해 peer 가 {@code averageIncomeItem} 을 더 이상 내려보내지 않는다.
 * 지출도 원천이 값을 주지 않는 분기에는 {@code expenseByCategoryItem} 이 통째로 null 이다. (이슈 #413)
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CommercialIncomeAndExpenseClientResponse(
    @JsonProperty("expenseByCategoryItem") CommercialExpenseByCategoryClientResponse expenseByCategory
) {

}
