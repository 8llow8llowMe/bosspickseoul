package com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query;

import lombok.Builder;

@Builder
public record StoreAdministrationClosedTopFiveQueryResult(
    String administrationCode,
    String administrationName,
    long closedStoreCount,
    double closureRate
) {

}
