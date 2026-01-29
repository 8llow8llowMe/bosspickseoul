package com.followfollowme.nowdoboss.domainlayer.commercial.application.info;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.IncomeCommercial;
import lombok.Builder;

@Builder
public record CommercialAverageIncomeInfo(
    long monthAverageIncome,
    int incomeSectionCode
) {

    public static CommercialAverageIncomeInfo from(IncomeCommercial incomeCommercial) {
        return CommercialAverageIncomeInfo.builder()
            .monthAverageIncome(incomeCommercial.monthAvgIncome())
            .incomeSectionCode(incomeCommercial.incomeSectionCode())
            .build();
    }
}
