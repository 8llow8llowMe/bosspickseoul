package com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.query;

import lombok.Builder;

@Builder
public record AdministrationServiceStoreQueryResult(
    String serviceCode,
    String serviceName,
    long totalStoreCount
) {

}
