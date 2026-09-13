package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import lombok.Builder;

@Builder
public record CommercialIncomeSummaryQueryResult(
    RegionalIncomeSummaryQueryResult district,
    RegionalIncomeSummaryQueryResult administration,
    RegionalIncomeSummaryQueryResult commercial
) {

}

