package com.followfollowme.nowdoboss.domainlayer.commercial.application.info;

import com.followfollowme.nowdoboss.domainlayer.commercial.application.common.PercentCalculator;
import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.SalesCommercial;
import lombok.Builder;

@Builder
public record CommercialAgeGenderPercentSalesInfo(
    double maleTeenSalesPercent,
    double femaleTeenSalesPercent,
    double maleTwentySalesPercent,
    double femaleTwentySalesPercent,
    double maleThirtySalesPercent,
    double femaleThirtySalesPercent,
    double maleFortySalesPercent,
    double femaleFortySalesPercent,
    double maleFiftySalesPercent,
    double femaleFiftySalesPercent,
    double maleSixtySalesPercent,
    double femaleSixtySalesPercent
) {

    public static CommercialAgeGenderPercentSalesInfo from(SalesCommercial salesCommercial) {
        long total = salesCommercial.maleSales() + salesCommercial.femaleSales();

        return CommercialAgeGenderPercentSalesInfo.builder()
            .maleTeenSalesPercent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.teenSales(), salesCommercial.maleSales(), total))
            .femaleTeenSalesPercent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.teenSales(), salesCommercial.femaleSales(), total))

            .maleTwentySalesPercent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.twentySales(), salesCommercial.maleSales(), total))
            .femaleTwentySalesPercent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.twentySales(), salesCommercial.femaleSales(), total))

            .maleThirtySalesPercent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.thirtySales(), salesCommercial.maleSales(), total))
            .femaleThirtySalesPercent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.thirtySales(), salesCommercial.femaleSales(), total))

            .maleFortySalesPercent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.fortySales(), salesCommercial.maleSales(), total))
            .femaleFortySalesPercent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.fortySales(), salesCommercial.femaleSales(), total))

            .maleFiftySalesPercent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.fiftySales(), salesCommercial.maleSales(), total))
            .femaleFiftySalesPercent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.fiftySales(), salesCommercial.femaleSales(), total))

            .maleSixtySalesPercent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.sixtySales(), salesCommercial.maleSales(), total))
            .femaleSixtySalesPercent(
                PercentCalculator.estimatedJointPercent(
                    salesCommercial.sixtySales(), salesCommercial.femaleSales(), total))
            .build();
    }
}
