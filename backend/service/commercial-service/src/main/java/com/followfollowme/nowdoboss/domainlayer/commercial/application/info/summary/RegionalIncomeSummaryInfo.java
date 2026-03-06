package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.summary;

import lombok.Builder;

@Builder
public record RegionalIncomeSummaryInfo(
    String code,
    String name,
    long totalExpenseAmount
) {

}
