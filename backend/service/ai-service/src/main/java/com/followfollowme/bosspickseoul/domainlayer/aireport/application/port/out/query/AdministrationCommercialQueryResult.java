package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import lombok.Builder;

@Builder
public record AdministrationCommercialQueryResult(
    String commercialCode,
    String commercialName
) {
}
