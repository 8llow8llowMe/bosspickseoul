package com.followfollowme.bosspickseoul.domainlayer.simulation.application.info;

import lombok.Builder;

@Builder
public record SimulationFranchiseeSearchInfo(
    long franchiseeId,
    String brandName,
    String serviceCode,
    String serviceName
) {

}
