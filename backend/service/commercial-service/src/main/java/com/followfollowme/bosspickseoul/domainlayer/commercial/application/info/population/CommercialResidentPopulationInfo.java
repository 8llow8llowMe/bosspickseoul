package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.population;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.common.PercentCalculator;
import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.PopulationCommercial;
import lombok.Builder;

@Builder
public record CommercialResidentPopulationInfo(
    // 실제로 조회한 기준 분기. 요청이 분기를 생략하면 서버가 정한 기본 분기다(이슈 #464).
    String periodCode,
    CommercialResidentPopulationByAgeInfo byAgeInfo,
    double malePercentage,
    double femalePercentage
) {

    public static CommercialResidentPopulationInfo from(PopulationCommercial populationCommercial) {
        long total = populationCommercial.maleResidentPopulation() + populationCommercial.femaleResidentPopulation();

        return CommercialResidentPopulationInfo.builder()
            .periodCode(populationCommercial.periodCode())
            .byAgeInfo(CommercialResidentPopulationByAgeInfo.from(populationCommercial))
            .malePercentage(PercentCalculator.ratio(populationCommercial.maleResidentPopulation(), total))
            .femalePercentage(PercentCalculator.ratio(populationCommercial.femaleResidentPopulation(), total))
            .build();
    }
}
