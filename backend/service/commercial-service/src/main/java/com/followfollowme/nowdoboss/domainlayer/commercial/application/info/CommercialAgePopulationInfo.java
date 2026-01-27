package com.followfollowme.nowdoboss.domainlayer.commercial.application.info;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.PopulationCommercial;
import lombok.Builder;

@Builder
public record CommercialAgePopulationInfo(
    long totalPopulation,
    long teenPopulation,
    long twentyPopulation,
    long thirtyPopulation,
    long fortyPopulation,
    long fiftyPopulation,
    long sixtyPopulation
) {

    public static CommercialAgePopulationInfo from(PopulationCommercial populationCommercial) {
        return CommercialAgePopulationInfo.builder()
            .totalPopulation(populationCommercial.totalPopulation())
            .teenPopulation(populationCommercial.teenPopulation())
            .twentyPopulation(populationCommercial.twentyPopulation())
            .thirtyPopulation(populationCommercial.thirtyPopulation())
            .fortyPopulation(populationCommercial.fortyPopulation())
            .fiftyPopulation(populationCommercial.fiftyPopulation())
            .sixtyPopulation(populationCommercial.sixtyPopulation())
            .build();
    }
}
