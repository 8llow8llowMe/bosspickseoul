package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CommercialResidentPopulationByAgeClientResponse(
    long totalResidentPopulation,
    long age10ResidentPopulation,
    long age20ResidentPopulation,
    long age30ResidentPopulation,
    long age40ResidentPopulation,
    long age50ResidentPopulation,
    long age60PlusResidentPopulation
) {

}
