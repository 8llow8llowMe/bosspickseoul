package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query;

public record RegionalSalesSummaryQueryResult(
    String code,
    String name,
    String serviceCode,
    String serviceName,
    long monthlySalesAmount
) {

}
