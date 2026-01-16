package com.followfollowme.nowdoboss.domainlayer.administration.domain.model;

import lombok.Builder;

@Builder
public record IncomeAdministration(
    long id,
    String periodCode,
    String administrationCode,
    String administrationCodeName,
    long totalPrice
) {

}
