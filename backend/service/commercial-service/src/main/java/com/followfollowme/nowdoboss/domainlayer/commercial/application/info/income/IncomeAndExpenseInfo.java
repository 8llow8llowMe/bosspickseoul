package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.income;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.IncomeCommercial;
import lombok.Builder;

@Builder
public record IncomeAndExpenseInfo(
    AverageIncomeInfo averageIncomeInfo,
    ExpenseByCategoryInfo expenseByCategoryInfo
) {

    public static IncomeAndExpenseInfo from(IncomeCommercial incomeCommercial) {
        return IncomeAndExpenseInfo.builder()
            .averageIncomeInfo(AverageIncomeInfo.from(incomeCommercial))
            .expenseByCategoryInfo(ExpenseByCategoryInfo.from(incomeCommercial))
            .build();
    }
}
