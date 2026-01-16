package com.followfollowme.nowdoboss.domainlayer.commercial.application.info;

import com.followfollowme.nowdoboss.domainlayer.commercial.application.common.PercentCalculator;
import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.FootTrafficCommercial;
import lombok.Builder;

@Builder
public record CommercialAgeGenderPercentFootTrafficInfo(
    double maleTeenFootTrafficPercent,
    double femaleTeenFootTrafficPercent,
    double maleTwentyFootTrafficPercent,
    double femaleTwentyFootTrafficPercent,
    double maleThirtyFootTrafficPercent,
    double femaleThirtyFootTrafficPercent,
    double maleFortyFootTrafficPercent,
    double femaleFortyFootTrafficPercent,
    double maleFiftyFootTrafficPercent,
    double femaleFiftyFootTrafficPercent,
    double maleSixtyFootTrafficPercent,
    double femaleSixtyFootTrafficPercent
) {

    public static CommercialAgeGenderPercentFootTrafficInfo from(FootTrafficCommercial footTrafficCommercial) {
        long total = footTrafficCommercial.totalFootTraffic();

        return CommercialAgeGenderPercentFootTrafficInfo.builder()
            .maleTeenFootTrafficPercent(
                PercentCalculator.estimatedJointPercent(footTrafficCommercial.teenFootTraffic(), footTrafficCommercial.maleFootTraffic(), total))
            .femaleTeenFootTrafficPercent(
                PercentCalculator.estimatedJointPercent(footTrafficCommercial.teenFootTraffic(), footTrafficCommercial.femaleFootTraffic(), total))

            .maleTwentyFootTrafficPercent(
                PercentCalculator.estimatedJointPercent(footTrafficCommercial.twentyFootTraffic(), footTrafficCommercial.maleFootTraffic(), total))
            .femaleTwentyFootTrafficPercent(
                PercentCalculator.estimatedJointPercent(footTrafficCommercial.twentyFootTraffic(), footTrafficCommercial.femaleFootTraffic(), total))
            
            .maleThirtyFootTrafficPercent(
                PercentCalculator.estimatedJointPercent(footTrafficCommercial.thirtyFootTraffic(), footTrafficCommercial.maleFootTraffic(), total))
            .femaleThirtyFootTrafficPercent(
                PercentCalculator.estimatedJointPercent(footTrafficCommercial.thirtyFootTraffic(), footTrafficCommercial.femaleFootTraffic(), total))

            .maleFortyFootTrafficPercent(
                PercentCalculator.estimatedJointPercent(footTrafficCommercial.fortyFootTraffic(), footTrafficCommercial.maleFootTraffic(), total))
            .femaleFortyFootTrafficPercent(
                PercentCalculator.estimatedJointPercent(footTrafficCommercial.fortyFootTraffic(), footTrafficCommercial.femaleFootTraffic(), total))

            .maleFiftyFootTrafficPercent(
                PercentCalculator.estimatedJointPercent(footTrafficCommercial.fiftyFootTraffic(), footTrafficCommercial.maleFootTraffic(), total))
            .femaleFiftyFootTrafficPercent(
                PercentCalculator.estimatedJointPercent(footTrafficCommercial.fiftyFootTraffic(), footTrafficCommercial.femaleFootTraffic(), total))

            .maleSixtyFootTrafficPercent(
                PercentCalculator.estimatedJointPercent(footTrafficCommercial.sixtyFootTraffic(), footTrafficCommercial.maleFootTraffic(), total))
            .femaleSixtyFootTrafficPercent(
                PercentCalculator.estimatedJointPercent(footTrafficCommercial.sixtyFootTraffic(), footTrafficCommercial.femaleFootTraffic(), total))
            .build();
    }
}
