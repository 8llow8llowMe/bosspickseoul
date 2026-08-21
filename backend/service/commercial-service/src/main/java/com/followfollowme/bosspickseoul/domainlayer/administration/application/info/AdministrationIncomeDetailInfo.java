package com.followfollowme.bosspickseoul.domainlayer.administration.application.info;

import lombok.Builder;

@Builder
public record AdministrationIncomeDetailInfo(
    long totalExpenseAmount
) {

}
