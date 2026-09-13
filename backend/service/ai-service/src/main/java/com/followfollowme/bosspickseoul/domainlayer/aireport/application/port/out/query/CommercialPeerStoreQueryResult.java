package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import lombok.Builder;

@Builder
public record CommercialPeerStoreQueryResult(
    String serviceCode,
    String serviceName,
    long totalStoreCount,
    double openingRate,
    double closureRate
) {

}

