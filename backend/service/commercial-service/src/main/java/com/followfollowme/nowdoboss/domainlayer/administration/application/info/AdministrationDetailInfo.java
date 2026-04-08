package com.followfollowme.nowdoboss.domainlayer.administration.application.info;

import lombok.Builder;

@Builder
public record AdministrationDetailInfo(
    String administrationCode,
    String administrationName,
    AdministrationSalesDetailInfo sales,
    AdministrationStoreDetailInfo store,
    AdministrationIncomeDetailInfo income
) {

}
