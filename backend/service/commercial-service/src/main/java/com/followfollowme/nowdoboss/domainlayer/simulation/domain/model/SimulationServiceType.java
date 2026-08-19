package com.followfollowme.nowdoboss.domainlayer.simulation.domain.model;

import lombok.Builder;

/**
 * 업종별 시뮬레이션 기준 정보 — 매장 크기(㎡)와 권리금 수준.
 */
@Builder
public record SimulationServiceType(
    long id,
    String serviceCode,
    String serviceName,
    int smallSize,
    int mediumSize,
    int largeSize,
    int keyMoneyAverage,
    Double keyMoneyLevel,
    Double keyMoneyRatio
) {

}
