package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.population;

import com.followfollowme.nowdoboss.domainlayer.commercial.application.common.PercentCalculator;
import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.PopulationCommercial;
import lombok.Builder;

@Builder
public record ResidentPopulationInfo(
    ResidentPopulationByAgeInfo byAgeInfo,
    double malePercentage,
    double femalePercentage
) {

    public static ResidentPopulationInfo from(PopulationCommercial populationCommercial) {
        long total = populationCommercial.maleResidentPopulation() + populationCommercial.femaleResidentPopulation();

        return ResidentPopulationInfo.builder()
            .byAgeInfo(ResidentPopulationByAgeInfo.from(populationCommercial))
            .malePercentage(PercentCalculator.ratio(populationCommercial.maleResidentPopulation(), total))
            .femalePercentage(PercentCalculator.ratio(populationCommercial.femaleResidentPopulation(), total))
            .build();
    }
}
