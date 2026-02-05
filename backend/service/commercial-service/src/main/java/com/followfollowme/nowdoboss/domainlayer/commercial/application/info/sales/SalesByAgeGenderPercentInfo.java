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
        long total = salesCommercial.maleSales() + salesCommercial.femaleSales();

        return SalesByAgeGenderPercentInfo.builder()
            .maleAge10Percent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.teenSales(), salesCommercial.maleSales(), total))
            .femaleAge10Percent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.teenSales(), salesCommercial.femaleSales(), total))

            .maleAge20Percent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.twentySales(), salesCommercial.maleSales(), total))
            .femaleAge20Percent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.twentySales(), salesCommercial.femaleSales(), total))

            .maleAge30Percent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.thirtySales(), salesCommercial.maleSales(), total))
            .femaleAge30Percent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.thirtySales(), salesCommercial.femaleSales(), total))

            .maleAge40Percent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.fortySales(), salesCommercial.maleSales(), total))
            .femaleAge40Percent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.fortySales(), salesCommercial.femaleSales(), total))

            .maleAge50Percent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.fiftySales(), salesCommercial.maleSales(), total))
            .femaleAge50Percent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.fiftySales(), salesCommercial.femaleSales(), total))

            .maleAge60PlusPercent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.sixtySales(), salesCommercial.maleSales(), total))
            .femaleAge60PlusPercent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.sixtySales(), salesCommercial.femaleSales(), total))
            .build();
    }
}
