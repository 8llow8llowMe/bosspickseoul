package com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out.query;

import lombok.Builder;

@Builder
public record AdministrationServiceStoreQueryResult(
    String serviceCode,
    String serviceName,
    long totalStoreCount
) {

}
