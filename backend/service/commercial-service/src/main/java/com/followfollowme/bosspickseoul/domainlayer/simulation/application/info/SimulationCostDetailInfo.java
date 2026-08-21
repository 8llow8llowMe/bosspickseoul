package com.followfollowme.bosspickseoul.domainlayer.simulation.application.info;

import lombok.Builder;

/**
 * 창업 비용 상세. 전 항목 단위: 만원. levy(가맹 부담금)는 비프랜차이즈 창업이면 null.
 */
@Builder
public record SimulationCostDetailInfo(
    long rentPrice,
    long deposit,
    long interior,
    Long levy
) {

}
