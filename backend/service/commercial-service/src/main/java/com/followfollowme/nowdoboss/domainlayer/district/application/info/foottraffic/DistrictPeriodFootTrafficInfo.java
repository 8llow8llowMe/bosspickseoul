package com.followfollowme.nowdoboss.domainlayer.district.application.info.foottraffic;

import lombok.Builder;

@Builder
public record DistrictPeriodFootTrafficInfo(
    String periodCode,
    long totalFootTraffic
) {

}

