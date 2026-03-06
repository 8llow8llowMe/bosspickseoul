package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.summary;

import lombok.Builder;

@Builder
public record CommercialSalesSummaryInfo(
    RegionalSalesSummaryInfo district,
    RegionalSalesSummaryInfo administration,
    RegionalSalesSummaryInfo commercial
) {

}
