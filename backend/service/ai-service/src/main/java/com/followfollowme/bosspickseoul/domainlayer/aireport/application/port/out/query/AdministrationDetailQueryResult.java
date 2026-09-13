package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import lombok.Builder;

@Builder
public record AdministrationDetailQueryResult(
    String administrationCode,
    String administrationName,
    AdministrationSalesDetailQueryResult sales,
    AdministrationStoreDetailQueryResult store,
    AdministrationIncomeDetailQueryResult income
) {
}
