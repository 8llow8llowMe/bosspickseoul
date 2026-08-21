package com.followfollowme.bosspickseoul.domainlayer.administration.domain.model;

import lombok.Builder;

@Builder
public record IncomeAdministration(
    long id,
    String periodCode,
    String administrationCode,
    String administrationName,
    long totalExpenseAmount
) {

}
