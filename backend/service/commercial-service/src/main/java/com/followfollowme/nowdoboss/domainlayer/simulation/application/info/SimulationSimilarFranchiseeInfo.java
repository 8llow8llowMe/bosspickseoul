package com.followfollowme.nowdoboss.domainlayer.simulation.application.info;

import lombok.Builder;

/**
 * 예상 총비용과 근접한 유사 프랜차이즈. 전 금액 단위: 만원.
 */
@Builder
public record SimulationSimilarFranchiseeInfo(
    long franchiseeId,
    String brandName,
    long totalPrice,
    long subscription,
    long education,
    long deposit,
    long etc,
    long interior
) {

}
