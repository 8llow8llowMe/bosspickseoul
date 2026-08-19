package com.followfollowme.nowdoboss.domainlayer.simulation.application.info;

import java.util.List;
import lombok.Builder;

/**
 * 자치구×업종 매출의 성별·연령 분석. salesAmount 단위: 만원.
 */
@Builder
public record SimulationGenderAgeInfo(
    double malePercent,
    double femalePercent,
    List<SimulationAgeSalesInfo> topAgeGroups
) {

}
