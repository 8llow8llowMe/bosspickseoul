package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import lombok.Builder;

@Builder
public record RegionalSalesSummaryQueryResult(
    String code,
    String name,
    String serviceCode,
    String serviceName,
    long monthlySalesAmount
) {

}

