package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query;

public record CommercialResidentPopulationQueryResult(
    CommercialResidentPopulationByAgeQueryResult byAgeItem,
    double malePercentage,
    double femalePercentage
) {

}

record CommercialResidentPopulationByAgeQueryResult(
    long totalResidentPopulation,
    long age10ResidentPopulation,
    long age20ResidentPopulation,
    long age30ResidentPopulation,
    long age40ResidentPopulation,
    long age50ResidentPopulation,
    long age60PlusResidentPopulation
) {}
