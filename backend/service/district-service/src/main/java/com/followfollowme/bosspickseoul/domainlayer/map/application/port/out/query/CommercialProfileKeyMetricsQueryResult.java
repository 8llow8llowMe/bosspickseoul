package com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query;

/**
 * 원천이 상권 단위 월 평균 소득 제공을 중단해 commercial-service 가 keyMetrics 에서 해당 지표를 걷어냈다.
 * 여기서도 함께 제거한다 — 남겨 두면 peer 가 주지 않는 값이라 항상 null 로만 내려간다. (이슈 #413)
 */
public record CommercialProfileKeyMetricsQueryResult(
    Double totalSalesAmount,
    Double totalFootTraffic,
    Long totalStoreCount,
    Long similarStoreCount,
    Double openingRate,
    Double closureRate,
    Long totalResidentPopulation,
    Long totalFacilityCount
) {

}
