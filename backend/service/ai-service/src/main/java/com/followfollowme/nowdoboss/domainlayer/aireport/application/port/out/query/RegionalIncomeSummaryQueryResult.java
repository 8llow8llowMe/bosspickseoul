package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query;

public record RegionalIncomeSummaryQueryResult(
    String code,
    String name,
    long totalExpenseAmount
) {

}
