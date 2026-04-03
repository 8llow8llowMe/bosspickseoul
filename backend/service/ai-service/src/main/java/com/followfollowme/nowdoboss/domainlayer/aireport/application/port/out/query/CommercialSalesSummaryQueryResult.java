package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query;

public record CommercialSalesSummaryQueryResult(
    RegionalSalesSummaryQueryResult district,
    RegionalSalesSummaryQueryResult administration,
    RegionalSalesSummaryQueryResult commercial
) {

}
