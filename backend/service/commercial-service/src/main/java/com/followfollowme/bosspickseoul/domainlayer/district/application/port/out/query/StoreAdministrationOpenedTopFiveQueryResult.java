package com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query;

import lombok.Builder;

@Builder
public record StoreAdministrationOpenedTopFiveQueryResult(
    String administrationCode,
    String administrationName,
    long openedStoreCount,
    double openingRate
) {

}
