package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.population;

import com.followfollowme.nowdoboss.domainlayer.commercial.application.common.PercentCalculator;
import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.PopulationCommercial;
import lombok.Builder;

@Builder
public record CommercialResidentPopulationInfo(
    CommercialResidentPopulationByAgeInfo byAgeInfo,
    double malePercentage,
    double femalePercentage
) {

    public static CommercialResidentPopulationInfo from(PopulationCommercial populationCommercial) {
        long total = populationCommercial.maleResidentPopulation() + populationCommercial.femaleResidentPopulation();

        return CommercialResidentPopulationInfo.builder()
            .byAgeInfo(CommercialResidentPopulationByAgeInfo.from(populationCommercial))
            .malePercentage(PercentCalculator.ratio(populationCommercial.maleResidentPopulation(), total))
            .femalePercentage(PercentCalculator.ratio(populationCommercial.femaleResidentPopulation(), total))
            .build();
    }
}
