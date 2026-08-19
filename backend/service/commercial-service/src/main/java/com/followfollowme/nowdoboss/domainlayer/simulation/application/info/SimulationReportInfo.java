package com.followfollowme.nowdoboss.domainlayer.simulation.application.info;

import java.util.List;
import lombok.Builder;

/**
 * 창업 시뮬레이션 리포트. totalPrice 단위: 만원.
 * genderAgeAnalysis / seasonAnalysis 는 기준 매출 데이터가 없으면 null 이다.
 */
@Builder
public record SimulationReportInfo(
    SimulationConditionInfo condition,
    long totalPrice,
    SimulationKeyMoneyInfo keyMoney,
    SimulationCostDetailInfo costDetail,
    List<SimulationSimilarFranchiseeInfo> similarFranchisees,
    SimulationGenderAgeInfo genderAgeAnalysis,
    SimulationSeasonInfo seasonAnalysis
) {

}
