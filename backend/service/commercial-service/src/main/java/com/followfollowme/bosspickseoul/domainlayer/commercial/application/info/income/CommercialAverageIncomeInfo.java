package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.income;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.IncomeCommercial;
import lombok.Builder;

@Builder
public record CommercialAverageIncomeInfo(
    long monthlyAverageIncomeAmount,
    int incomeBracketCode
) {

    public static CommercialAverageIncomeInfo from(IncomeCommercial incomeCommercial) {
        return CommercialAverageIncomeInfo.builder()
            .monthlyAverageIncomeAmount(incomeCommercial.monthlyAverageIncomeAmount())
            .incomeBracketCode(incomeCommercial.incomeBracketCode())
            .build();
    }
}
