package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.foottraffic;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.common.PercentCalculator;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.FootTrafficCommercial;
import lombok.Builder;

@Builder
public record CommercialFootTrafficByAgeGenderPercentInfo(
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

    public static CommercialFootTrafficByAgeGenderPercentInfo from(FootTrafficCommercial footTrafficCommercial) {
        long total = footTrafficCommercial.totalFootTraffic();

        return CommercialFootTrafficByAgeGenderPercentInfo.builder()
            .maleAge10Percent(PercentCalculator.estimatedJointPercent(
                footTrafficCommercial.age10FootTraffic(), footTrafficCommercial.maleFootTraffic(), total))
            .femaleAge10Percent(PercentCalculator.estimatedJointPercent(
                footTrafficCommercial.age10FootTraffic(), footTrafficCommercial.femaleFootTraffic(), total))

            .maleAge20Percent(PercentCalculator.estimatedJointPercent(
                footTrafficCommercial.age20FootTraffic(), footTrafficCommercial.maleFootTraffic(), total))
            .femaleAge20Percent(PercentCalculator.estimatedJointPercent(
                footTrafficCommercial.age20FootTraffic(), footTrafficCommercial.femaleFootTraffic(), total))

            .maleAge30Percent(PercentCalculator.estimatedJointPercent(
                footTrafficCommercial.age30FootTraffic(), footTrafficCommercial.maleFootTraffic(), total))
            .femaleAge30Percent(PercentCalculator.estimatedJointPercent(
                footTrafficCommercial.age30FootTraffic(), footTrafficCommercial.femaleFootTraffic(), total))

            .maleAge40Percent(PercentCalculator.estimatedJointPercent(
                footTrafficCommercial.age40FootTraffic(), footTrafficCommercial.maleFootTraffic(), total))
            .femaleAge40Percent(PercentCalculator.estimatedJointPercent(
                footTrafficCommercial.age40FootTraffic(), footTrafficCommercial.femaleFootTraffic(), total))

            .maleAge50Percent(PercentCalculator.estimatedJointPercent(
                footTrafficCommercial.age50FootTraffic(), footTrafficCommercial.maleFootTraffic(), total))
            .femaleAge50Percent(PercentCalculator.estimatedJointPercent(
                footTrafficCommercial.age50FootTraffic(), footTrafficCommercial.femaleFootTraffic(), total))

            .maleAge60PlusPercent(PercentCalculator.estimatedJointPercent(
                footTrafficCommercial.age60PlusFootTraffic(), footTrafficCommercial.maleFootTraffic(), total))
            .femaleAge60PlusPercent(PercentCalculator.estimatedJointPercent(
                footTrafficCommercial.age60PlusFootTraffic(), footTrafficCommercial.femaleFootTraffic(), total))
            .build();
    }
}
