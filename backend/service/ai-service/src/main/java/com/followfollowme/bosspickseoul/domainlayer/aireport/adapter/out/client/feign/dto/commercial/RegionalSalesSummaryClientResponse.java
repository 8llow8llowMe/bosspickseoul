package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record RegionalSalesSummaryClientResponse(
    String code,
    String name,
    String serviceCode,
    String serviceName,
    long monthlySalesAmount
) {

}
