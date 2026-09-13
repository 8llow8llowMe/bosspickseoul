package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import lombok.Builder;

@Builder
public record DistrictClosedStoreAdministrationTopQueryResult(
    String administrationCode,
    String administrationName,
    long closedStoreCount,
    double closureRate
) {

}

