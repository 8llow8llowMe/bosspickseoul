package com.followfollowme.nowdoboss.domainlayer.commercial.domain.model;

import lombok.Builder;

@Builder
public record PopulationCommercial(
    long id,
    String periodCode,
    String commercialClassificationCode,
    String commercialClassificationName,
    String commercialCode,
    String commercialName,
    long totalResidentPopulation,
    long maleResidentPopulation,
    long femaleResidentPopulation,
    long age10ResidentPopulation,
    long age20ResidentPopulation,
    long age30ResidentPopulation,
    long age40ResidentPopulation,
    long age50ResidentPopulation,
    long age60PlusResidentPopulation
) {

}
