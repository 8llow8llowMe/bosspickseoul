package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import lombok.Builder;

@Builder
public record CommercialResidentPopulationByAgeQueryResult(
    long totalResidentPopulation,
    long age10ResidentPopulation,
    long age20ResidentPopulation,
    long age30ResidentPopulation,
    long age40ResidentPopulation,
    long age50ResidentPopulation,
    long age60PlusResidentPopulation
) {

}

