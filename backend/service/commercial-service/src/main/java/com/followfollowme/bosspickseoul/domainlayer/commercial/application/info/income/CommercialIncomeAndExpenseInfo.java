package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.IncomeCommercial;
import lombok.Builder;

@Builder
public record CommercialIncomeAndExpenseInfo(
    Long expenseCategorySum,
    CommercialExpenseByCategoryInfo expenseByCategoryInfo
) {

    /**
     * 원천이 지출을 주지 않는 분기에는 두 필드를 함께 비운다. 판정은 도메인
     * {@link IncomeCommercial#expenseUnavailable()} 한 곳에만 있고, 요약 경로도 같은 메서드를 쓴다. (이슈 #413)
     */
    public static CommercialIncomeAndExpenseInfo from(IncomeCommercial incomeCommercial) {
        if (incomeCommercial.expenseUnavailable()) {
            return CommercialIncomeAndExpenseInfo.builder().build();
        }
        return CommercialIncomeAndExpenseInfo.builder()
            .expenseCategorySum(incomeCommercial.expenseCategorySum())
            .expenseByCategoryInfo(CommercialExpenseByCategoryInfo.from(incomeCommercial))
            .build();
    }
}
