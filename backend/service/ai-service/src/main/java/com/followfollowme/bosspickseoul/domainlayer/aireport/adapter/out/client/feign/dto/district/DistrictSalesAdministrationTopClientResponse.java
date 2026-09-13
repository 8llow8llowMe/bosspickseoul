package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.district;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record DistrictSalesAdministrationTopClientResponse(
    String administrationCode,
    String administrationName,
    long totalSalesAmount,
    double salesChangeRate
) {

}
