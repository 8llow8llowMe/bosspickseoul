package com.followfollowme.nowdoboss.domainlayer.commercial.application.info;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.IncomeCommercial;
import lombok.Builder;

@Builder
public record CommercialIncomeInfo(
    CommercialAverageIncomeInfo averageIncomeInfo,
    CommercialCategorySpendingInfo categorySpendingInfo
) {

    public static CommercialIncomeInfo from(IncomeCommercial incomeCommercial) {
        return CommercialIncomeInfo.builder()
            .averageIncomeInfo(CommercialAverageIncomeInfo.from(incomeCommercial))
            .categorySpendingInfo(CommercialCategorySpendingInfo.from(incomeCommercial))
            .build();
    }
}
