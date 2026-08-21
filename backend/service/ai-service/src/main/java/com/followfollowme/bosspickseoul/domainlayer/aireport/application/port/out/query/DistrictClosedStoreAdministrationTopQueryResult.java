package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Builder;

@JsonIgnoreProperties(ignoreUnknown = true)
@Builder
public record DistrictClosedStoreAdministrationTopQueryResult(
    String administrationCode,
    String administrationName,
    long closedStoreCount,
    double closureRate
) {

}

