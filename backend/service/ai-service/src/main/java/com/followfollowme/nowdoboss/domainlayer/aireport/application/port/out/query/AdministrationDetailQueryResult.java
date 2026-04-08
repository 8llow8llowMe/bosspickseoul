package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Builder;

@JsonIgnoreProperties(ignoreUnknown = true)
@Builder
public record AdministrationDetailQueryResult(
    String administrationCode,
    String administrationName,
    AdministrationSalesDetailQueryResult sales,
    AdministrationStoreDetailQueryResult store,
    AdministrationIncomeDetailQueryResult income
) {
}
