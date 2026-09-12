package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import lombok.Builder;

@Builder
public record CommercialSalesByTimeSlotQueryResult(
    long salesAmountTime00To06,
    long salesAmountTime06To11,
    long salesAmountTime11To14,
    long salesAmountTime14To17,
    long salesAmountTime17To21,
    long salesAmountTime21To24
) {

}

