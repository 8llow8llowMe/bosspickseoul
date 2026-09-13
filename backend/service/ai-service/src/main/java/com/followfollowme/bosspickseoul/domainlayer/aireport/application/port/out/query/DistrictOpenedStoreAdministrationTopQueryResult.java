package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import lombok.Builder;

@Builder
public record DistrictOpenedStoreAdministrationTopQueryResult(
    String administrationCode,
    String administrationName,
    long openedStoreCount,
    double openingRate
) {

}

