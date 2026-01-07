package com.followfollowme.nowdoboss.domainlayer.commercial.application.info;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.FootTrafficCommercial;
import lombok.Builder;

@Builder
public record CommercialAgeGroupFootTrafficInfo(
    long teenFootTraffic,
    long twentyFootTraffic,
    long thirtyFootTraffic,
    long fortyFootTraffic,
    long fiftyFootTraffic,
    long sixtyFootTraffic
) {

    public static CommercialAgeGroupFootTrafficInfo from(FootTrafficCommercial footTrafficCommercial) {
        return CommercialAgeGroupFootTrafficInfo.builder()
            .teenFootTraffic(footTrafficCommercial.teenFootTraffic())
            .twentyFootTraffic(footTrafficCommercial.twentyFootTraffic())
            .thirtyFootTraffic(footTrafficCommercial.thirtyFootTraffic())
            .fortyFootTraffic(footTrafficCommercial.fortyFootTraffic())
            .fiftyFootTraffic(footTrafficCommercial.fiftyFootTraffic())
            .sixtyFootTraffic(footTrafficCommercial.sixtyFootTraffic())
            .build();
    }
}
