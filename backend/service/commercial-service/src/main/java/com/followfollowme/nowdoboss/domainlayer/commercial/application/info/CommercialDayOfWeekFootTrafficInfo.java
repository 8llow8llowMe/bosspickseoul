package com.followfollowme.nowdoboss.domainlayer.commercial.application.info;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.FootTrafficCommercial;
import lombok.Builder;

@Builder
public record CommercialDayOfWeekFootTrafficInfo(
    long monFootTraffic,
    long tueFootTraffic,
    long wedFootTraffic,
    long thuFootTraffic,
    long friFootTraffic,
    long satFootTraffic,
    long sunFootTraffic
) {

    public static CommercialDayOfWeekFootTrafficInfo from(FootTrafficCommercial footTraffic) {
        return CommercialDayOfWeekFootTrafficInfo.builder()
            .monFootTraffic(footTraffic.monFootTraffic())
            .tueFootTraffic(footTraffic.tueFootTraffic())
            .wedFootTraffic(footTraffic.wedFootTraffic())
            .thuFootTraffic(footTraffic.thuFootTraffic())
            .friFootTraffic(footTraffic.friFootTraffic())
            .satFootTraffic(footTraffic.satFootTraffic())
            .sunFootTraffic(footTraffic.sunFootTraffic())
            .build();
    }
}
