package com.followfollowme.nowdoboss.domainlayer.simulation.application.info;

import lombok.Builder;

@Builder
public record SimulationAgeSalesInfo(
    String ageGroupName,
    long salesAmount
) {

}
