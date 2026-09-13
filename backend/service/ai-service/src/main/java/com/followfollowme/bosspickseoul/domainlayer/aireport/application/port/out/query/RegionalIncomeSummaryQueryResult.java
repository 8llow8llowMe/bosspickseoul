package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import lombok.Builder;

@Builder
public record RegionalIncomeSummaryQueryResult(String code, String name, long totalExpenseAmount) {

}

