package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.summary;

import lombok.Builder;

@Builder
public record RegionalIncomeSummaryInfo(
    String code,
    String name,
    long totalExpenseAmount
) {

}
