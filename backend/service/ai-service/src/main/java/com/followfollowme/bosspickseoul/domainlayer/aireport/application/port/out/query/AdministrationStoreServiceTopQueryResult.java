package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Builder;

@JsonIgnoreProperties(ignoreUnknown = true)
@Builder
public record AdministrationStoreServiceTopQueryResult(
    String serviceCode,
    String serviceName,
    long totalStoreCount,
    long similarStoreCount,
    long openedStoreCount,
    long closedStoreCount,
    long franchiseStoreCount,
    double openingRate,
    double closureRate
) {
}