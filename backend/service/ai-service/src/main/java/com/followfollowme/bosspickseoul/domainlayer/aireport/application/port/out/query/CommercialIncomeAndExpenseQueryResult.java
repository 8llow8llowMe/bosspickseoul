package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import lombok.Builder;

/**
 * 지출은 원천이 값을 주지 않는 분기에 {@code expenseByCategory} 가 null 이다(이슈 #413).
 * 0 으로 채우면 "실제로 0원" 과 구별되지 않으므로 null 을 그대로 통과시킨다.
 */
@Builder
public record CommercialIncomeAndExpenseQueryResult(
    CommercialExpenseByCategoryQueryResult expenseByCategory
) {}
