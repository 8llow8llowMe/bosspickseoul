package com.followfollowme.nowdoboss.domainlayer.simulation.domain.model;

import lombok.Builder;

/**
 * 프랜차이즈 창업 비용 기준. 금액 단위: 천원. unitArea 는 3.3㎡당 인테리어 비용(천원).
 */
@Builder
public record SimulationFranchisee(
    long id,
    String baseYear,
    String serviceCode,
    String serviceName,
    String brandName,
    int subscription,
    int education,
    int deposit,
    int etc,
    int totalLevy,
    int unitArea,
    int interior,
    int area
) {

}
