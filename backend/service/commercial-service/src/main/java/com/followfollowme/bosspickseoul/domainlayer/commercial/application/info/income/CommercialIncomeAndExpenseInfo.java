package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.IncomeCommercial;
import lombok.Builder;

@Builder
public record CommercialIncomeAndExpenseInfo(
    CommercialAverageIncomeInfo averageIncomeInfo,
    CommercialExpenseByCategoryInfo expenseByCategoryInfo
) {

    public static CommercialIncomeAndExpenseInfo from(IncomeCommercial incomeCommercial) {
        return CommercialIncomeAndExpenseInfo.builder()
            .averageIncomeInfo(CommercialAverageIncomeInfo.from(incomeCommercial))
            .expenseByCategoryInfo(CommercialExpenseByCategoryInfo.from(incomeCommercial))
            .build();
    }
}
