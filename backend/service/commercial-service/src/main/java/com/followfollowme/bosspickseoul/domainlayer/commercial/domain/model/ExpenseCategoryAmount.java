package com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.enums.ExpenseCategoryType;

/**
 * 소비 지출 항목 하나와 그 금액. 스코프마다 항목 수와 구성이 달라 고정 필드 레코드로는 표현할 수 없다. (이슈 #415)
 */
public record ExpenseCategoryAmount(
    ExpenseCategoryType category,
    long amount
) {

    public static ExpenseCategoryAmount of(ExpenseCategoryType category, long amount) {
        return new ExpenseCategoryAmount(category, amount);
    }
}
