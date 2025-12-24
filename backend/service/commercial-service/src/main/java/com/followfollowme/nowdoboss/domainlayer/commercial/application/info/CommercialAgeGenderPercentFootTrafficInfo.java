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

    public static CommercialAgeGenderPercentFootTrafficInfo from(FootTrafficCommercial footTraffic) {
        long total = footTraffic.totalFootTraffic();

        return CommercialAgeGenderPercentFootTrafficInfo.builder()
            .maleTeenFootTrafficPercent(
                calculatePercent(footTraffic.teenFootTraffic(), footTraffic.maleFootTraffic(), total))
            .femaleTeenFootTrafficPercent(
                calculatePercent(footTraffic.teenFootTraffic(), footTraffic.femaleFootTraffic(), total))
            .maleTwentyFootTrafficPercent(
                calculatePercent(footTraffic.twentyFootTraffic(), footTraffic.maleFootTraffic(), total))
            .femaleTwentyFootTrafficPercent(
                calculatePercent(footTraffic.twentyFootTraffic(), footTraffic.femaleFootTraffic(), total))
            .maleThirtyFootTrafficPercent(
                calculatePercent(footTraffic.thirtyFootTraffic(), footTraffic.maleFootTraffic(), total))
            .femaleThirtyFootTrafficPercent(
                calculatePercent(footTraffic.thirtyFootTraffic(), footTraffic.femaleFootTraffic(), total))
            .maleFortyFootTrafficPercent(
                calculatePercent(footTraffic.fortyFootTraffic(), footTraffic.maleFootTraffic(), total))
            .femaleFortyFootTrafficPercent(
                calculatePercent(footTraffic.fortyFootTraffic(), footTraffic.femaleFootTraffic(), total))
            .maleFiftyFootTrafficPercent(
                calculatePercent(footTraffic.fiftyFootTraffic(), footTraffic.maleFootTraffic(), total))
            .femaleFiftyFootTrafficPercent(
                calculatePercent(footTraffic.fiftyFootTraffic(), footTraffic.femaleFootTraffic(), total))
            .maleSixtyFootTrafficPercent(
                calculatePercent(footTraffic.sixtyFootTraffic(), footTraffic.maleFootTraffic(), total))
            .femaleSixtyFootTrafficPercent(
                calculatePercent(footTraffic.sixtyFootTraffic(), footTraffic.femaleFootTraffic(), total))
            .build();
    }

    private static double calculatePercent(long ageGroupTraffic, long genderTraffic, long total) {
        if (total == 0) {
            return 0.0;
        }
        return Math.round((double) ageGroupTraffic / total * genderTraffic / total * 10000.0) / 100.0;
    }
}
