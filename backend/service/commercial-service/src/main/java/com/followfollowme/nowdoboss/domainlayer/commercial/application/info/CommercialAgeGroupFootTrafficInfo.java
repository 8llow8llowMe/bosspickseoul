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

    public static CommercialAgeGroupFootTrafficInfo from(FootTrafficCommercial footTraffic) {
        return CommercialAgeGroupFootTrafficInfo.builder()
            .teenFootTraffic(footTraffic.teenFootTraffic())
            .twentyFootTraffic(footTraffic.twentyFootTraffic())
            .thirtyFootTraffic(footTraffic.thirtyFootTraffic())
            .fortyFootTraffic(footTraffic.fortyFootTraffic())
            .fiftyFootTraffic(footTraffic.fiftyFootTraffic())
            .sixtyFootTraffic(footTraffic.sixtyFootTraffic())
            .build();
    }
}
