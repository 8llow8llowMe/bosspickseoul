package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import lombok.Builder;

@Builder
public record CommercialSalesSummaryQueryResult(
    RegionalSalesSummaryQueryResult district,
    RegionalSalesSummaryQueryResult administration,
    RegionalSalesSummaryQueryResult commercial
) {

}

