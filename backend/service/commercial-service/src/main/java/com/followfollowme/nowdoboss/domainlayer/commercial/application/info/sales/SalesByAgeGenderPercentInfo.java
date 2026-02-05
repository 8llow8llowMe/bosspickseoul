package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales;

import com.followfollowme.nowdoboss.domainlayer.commercial.application.common.PercentCalculator;
import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.SalesCommercial;
import lombok.Builder;

@Builder
public record SalesByAgeGenderPercentInfo(
    double maleAge10Percent,
    double femaleAge10Percent,
    double maleAge20Percent,
    double femaleAge20Percent,
    double maleAge30Percent,
    double femaleAge30Percent,
    double maleAge40Percent,
    double femaleAge40Percent,
    double maleAge50Percent,
    double femaleAge50Percent,
    double maleAge60PlusPercent,
    double femaleAge60PlusPercent
) {

    public static SalesByAgeGenderPercentInfo from(SalesCommercial salesCommercial) {
        long total = salesCommercial.maleSalesAmount() + salesCommercial.femaleSalesAmount();

        return SalesByAgeGenderPercentInfo.builder()
            .maleAge10Percent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.age10SalesAmount(), salesCommercial.maleSalesAmount(), total))
            .femaleAge10Percent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.age10SalesAmount(), salesCommercial.femaleSalesAmount(), total))

            .maleAge20Percent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.age20SalesAmount(), salesCommercial.maleSalesAmount(), total))
            .femaleAge20Percent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.age20SalesAmount(), salesCommercial.femaleSalesAmount(), total))

            .maleAge30Percent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.age30SalesAmount(), salesCommercial.maleSalesAmount(), total))
            .femaleAge30Percent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.age30SalesAmount(), salesCommercial.femaleSalesAmount(), total))

            .maleAge40Percent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.age40SalesAmount(), salesCommercial.maleSalesAmount(), total))
            .femaleAge40Percent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.age40SalesAmount(), salesCommercial.femaleSalesAmount(), total))

            .maleAge50Percent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.age50SalesAmount(), salesCommercial.maleSalesAmount(), total))
            .femaleAge50Percent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.age50SalesAmount(), salesCommercial.femaleSalesAmount(), total))

            .maleAge60PlusPercent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.age60PlusSalesAmount(), salesCommercial.maleSalesAmount(), total))
            .femaleAge60PlusPercent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.age60PlusSalesAmount(), salesCommercial.femaleSalesAmount(), total))
            .build();
    }
}
