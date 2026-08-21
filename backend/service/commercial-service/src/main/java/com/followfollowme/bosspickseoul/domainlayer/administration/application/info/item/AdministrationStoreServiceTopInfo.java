package com.followfollowme.bosspickseoul.domainlayer.administration.application.info.item;

import lombok.Builder;

@Builder
public record AdministrationStoreServiceTopInfo(
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
