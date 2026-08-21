package com.followfollowme.bosspickseoul.domainlayer.administration.application.info;

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
