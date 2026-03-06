package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.summary;

import lombok.Builder;

@Builder
public record CommercialIncomeSummaryInfo(
    RegionalIncomeSummaryInfo district,
    RegionalIncomeSummaryInfo administration,
    RegionalIncomeSummaryInfo commercial
) {

}
