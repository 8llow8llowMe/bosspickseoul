package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.population;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.PopulationCommercial;
import lombok.Builder;

@Builder
public record ResidentPopulationByAgeInfo(
    long totalResidentPopulation,
    long age10ResidentPopulation,
    long age20ResidentPopulation,
    long age30ResidentPopulation,
    long age40ResidentPopulation,
    long age50ResidentPopulation,
    long age60PlusResidentPopulation
) {

    public static ResidentPopulationByAgeInfo from(PopulationCommercial populationCommercial) {
        return ResidentPopulationByAgeInfo.builder()
            .totalResidentPopulation(populationCommercial.totalResidentPopulation())
            .age10ResidentPopulation(populationCommercial.age10ResidentPopulation())
            .age20ResidentPopulation(populationCommercial.age20ResidentPopulation())
            .age30ResidentPopulation(populationCommercial.age30ResidentPopulation())
            .age40ResidentPopulation(populationCommercial.age40ResidentPopulation())
            .age50ResidentPopulation(populationCommercial.age50ResidentPopulation())
            .age60PlusResidentPopulation(populationCommercial.age60PlusResidentPopulation())
            .build();
    }
}
