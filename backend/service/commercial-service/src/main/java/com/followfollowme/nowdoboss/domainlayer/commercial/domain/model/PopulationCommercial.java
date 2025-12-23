package com.followfollowme.nowdoboss.domainlayer.commercial.domain.model;

import lombok.Builder;

@Builder
public record PopulationCommercial(
    long id,
    String periodCode,
    String commercialClassificationCode,
    String commercialClassificationCodeName,
    String commercialCode,
    String commercialCodeName,
    long totalPopulation,
    long malePopulation,
    long femalePopulation,
    long teenPopulation,
    long twentyPopulation,
    long thirtyPopulation,
    long fortyPopulation,
    long fiftyPopulation,
    long sixtyPopulation
) {

}
