package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CommercialPeerStoreClientResponse(
    String serviceCode,
    String serviceName,
    long totalStoreCount,
    double openingRate,
    double closureRate
) {

}
