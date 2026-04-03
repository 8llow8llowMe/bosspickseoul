package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query;

public record CommercialIncomeSummaryQueryResult(
    RegionalIncomeSummaryQueryResult district,
    RegionalIncomeSummaryQueryResult administration,
    RegionalIncomeSummaryQueryResult commercial
) {

}
