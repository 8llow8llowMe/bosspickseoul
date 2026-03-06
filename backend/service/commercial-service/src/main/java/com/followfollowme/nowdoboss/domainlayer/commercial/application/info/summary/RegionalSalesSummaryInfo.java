package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.summary;

import lombok.Builder;

@Builder
public record RegionalSalesSummaryInfo(
    String code,
    String name,
    String serviceCode,
    String serviceName,
    long monthlySalesAmount
) {

}
