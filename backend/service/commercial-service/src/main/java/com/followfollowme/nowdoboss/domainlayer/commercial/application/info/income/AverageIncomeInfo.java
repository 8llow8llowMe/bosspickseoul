package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.income;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.IncomeCommercial;
import lombok.Builder;

@Builder
public record AverageIncomeInfo(
    long monthlyAverageIncomeAmount,
    int incomeBracketCode
) {

    public static AverageIncomeInfo from(IncomeCommercial incomeCommercial) {
        return AverageIncomeInfo.builder()
            .monthlyAverageIncomeAmount(incomeCommercial.monthlyAverageIncomeAmount())
            .incomeBracketCode(incomeCommercial.incomeBracketCode())
            .build();
    }
}
