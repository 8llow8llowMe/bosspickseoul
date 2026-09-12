package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import lombok.Builder;

@Builder
public record CommercialFacilityQueryResult(
    long totalFacilityCount,
    CommercialSchoolCountQueryResult schoolCount,
    long totalTransportationFacilityCount
) {}
