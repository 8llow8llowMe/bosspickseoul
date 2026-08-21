package com.followfollowme.bosspickseoul.domainlayer.administration.domain.model;

import com.followfollowme.bosspickseoul.domainlayer.category.domain.enums.ServiceType;
import lombok.Builder;

@Builder
public record SalesAdministration(
    long id,
    String periodCode,
    String administrationCode,
    String administrationName,
    String serviceCode,
    String serviceName,
    ServiceType serviceType,
    long monthlySalesAmount,
    long weekdaySalesAmount,
    long weekendSalesAmount
) {

}
