package com.followfollowme.nowdoboss.domainlayer.simulation.application.port.out.query;

import lombok.Builder;

/**
 * 자치구×업종 매출 조회 결과 — 성별·연령 분석과 성수기 판정에 사용한다. 금액 단위: 원.
 */
@Builder
public record DistrictServiceSalesQueryResult(
    String periodCode,
    long monthlySalesAmount,
    long maleSalesAmount,
    long femaleSalesAmount,
    long age10SalesAmount,
    long age20SalesAmount,
    long age30SalesAmount,
    long age40SalesAmount,
    long age50SalesAmount,
    long age60PlusSalesAmount
) {

}
