package com.followfollowme.nowdoboss.domainlayer.simulation.application.info;

import lombok.Builder;

/**
 * 권리금 수준 정보. keyMoneyAverage 단위: 만원, keyMoneyLevel 단위: 만원/㎡, keyMoneyRatio 단위: %.
 */
@Builder
public record SimulationKeyMoneyInfo(
    Double keyMoneyRatio,
    int keyMoneyAverage,
    Double keyMoneyLevel
) {

}
