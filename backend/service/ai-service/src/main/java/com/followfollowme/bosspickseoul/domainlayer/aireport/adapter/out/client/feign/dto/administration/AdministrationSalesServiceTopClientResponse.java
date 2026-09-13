package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.administration;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AdministrationSalesServiceTopClientResponse(
    String serviceCode,
    String serviceName,
    long monthlySalesAmount,
    double salesChangeRate
) {

}
