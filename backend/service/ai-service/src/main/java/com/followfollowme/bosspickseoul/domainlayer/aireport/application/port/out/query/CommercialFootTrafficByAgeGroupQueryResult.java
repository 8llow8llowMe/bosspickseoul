package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import lombok.Builder;

@Builder
public record CommercialFootTrafficByAgeGroupQueryResult(
    long age10FootTraffic,
    long age20FootTraffic,
    long age30FootTraffic,
    long age40FootTraffic,
    long age50FootTraffic,
    long age60PlusFootTraffic
) {

}

