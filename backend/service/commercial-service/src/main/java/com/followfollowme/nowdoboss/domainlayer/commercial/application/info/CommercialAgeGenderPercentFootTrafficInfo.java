package com.followfollowme.nowdoboss.domainlayer.commercial.application.info;

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
                calculatePercent(footTrafficCommercial.teenFootTraffic(), footTrafficCommercial.maleFootTraffic(), total))
            .femaleTeenFootTrafficPercent(
                calculatePercent(footTrafficCommercial.teenFootTraffic(), footTrafficCommercial.femaleFootTraffic(), total))
            .maleTwentyFootTrafficPercent(
                calculatePercent(footTrafficCommercial.twentyFootTraffic(), footTrafficCommercial.maleFootTraffic(), total))
            .femaleTwentyFootTrafficPercent(
                calculatePercent(footTrafficCommercial.twentyFootTraffic(), footTrafficCommercial.femaleFootTraffic(), total))
            .maleThirtyFootTrafficPercent(
                calculatePercent(footTrafficCommercial.thirtyFootTraffic(), footTrafficCommercial.maleFootTraffic(), total))
            .femaleThirtyFootTrafficPercent(
                calculatePercent(footTrafficCommercial.thirtyFootTraffic(), footTrafficCommercial.femaleFootTraffic(), total))
            .maleFortyFootTrafficPercent(
                calculatePercent(footTrafficCommercial.fortyFootTraffic(), footTrafficCommercial.maleFootTraffic(), total))
            .femaleFortyFootTrafficPercent(
                calculatePercent(footTrafficCommercial.fortyFootTraffic(), footTrafficCommercial.femaleFootTraffic(), total))
            .maleFiftyFootTrafficPercent(
                calculatePercent(footTrafficCommercial.fiftyFootTraffic(), footTrafficCommercial.maleFootTraffic(), total))
            .femaleFiftyFootTrafficPercent(
                calculatePercent(footTrafficCommercial.fiftyFootTraffic(), footTrafficCommercial.femaleFootTraffic(), total))
            .maleSixtyFootTrafficPercent(
                calculatePercent(footTrafficCommercial.sixtyFootTraffic(), footTrafficCommercial.maleFootTraffic(), total))
            .femaleSixtyFootTrafficPercent(
                calculatePercent(footTrafficCommercial.sixtyFootTraffic(), footTrafficCommercial.femaleFootTraffic(), total))
            .build();
    }

    private static double calculatePercent(long ageGroupTraffic, long genderTraffic, long total) {
        if (total == 0) {
            return 0.0;
        }
        return Math.round((double) ageGroupTraffic / total * genderTraffic / total * 10000.0) / 100.0;
    }
}
