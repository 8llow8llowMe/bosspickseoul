package com.followfollowme.nowdoboss.domainlayer.administration.application.info.item;

import lombok.Builder;

@Builder
public record AdministrationSalesServiceTopInfo(
    String serviceCode,
    String serviceName,
    long monthlySalesAmount,
    double salesChangeRate
) {

}
