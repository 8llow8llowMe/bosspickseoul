package com.followfollowme.nowdoboss.domainlayer.administration.domain.model;

import com.followfollowme.nowdoboss.domainlayer.category.domain.enums.ServiceType;
import lombok.Builder;

@Builder
public record SalesAdministration(
    long id,
    String periodCode,
    String administrationCode,
    String administrationCodeName,
    String serviceCode,
    String serviceCodeName,
    ServiceType serviceType,
    long monthSales,
    long weekdaySales,
    long weekendSales
) {

}
