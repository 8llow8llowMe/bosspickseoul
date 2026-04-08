package com.followfollowme.nowdoboss.domainlayer.administration.application.info;

import lombok.Builder;

@Builder
public record AdministrationIncomeDetailInfo(
    long totalExpenseAmount
) {

}
