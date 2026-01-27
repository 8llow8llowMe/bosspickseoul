package com.followfollowme.nowdoboss.domainlayer.commercial.application.info;

import com.followfollowme.nowdoboss.domainlayer.commercial.application.common.PercentCalculator;
import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.PopulationCommercial;
import lombok.Builder;

@Builder
public record CommercialPopulationInfo(
    CommercialAgePopulationInfo agePopulationInfo,
    double malePercentage,
    double femalePercentage
) {

    public static CommercialPopulationInfo from(PopulationCommercial populationCommercial) {
        long total = populationCommercial.malePopulation() + populationCommercial.femalePopulation();

        return CommercialPopulationInfo.builder()
            .agePopulationInfo(CommercialAgePopulationInfo.from(populationCommercial))
            .malePercentage(PercentCalculator.ratio(populationCommercial.malePopulation(), total))
            .femalePercentage(PercentCalculator.ratio(populationCommercial.femalePopulation(), total))
            .build();
    }
}
