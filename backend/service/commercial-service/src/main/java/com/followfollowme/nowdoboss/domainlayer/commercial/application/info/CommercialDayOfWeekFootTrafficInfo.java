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

    public static CommercialDayOfWeekFootTrafficInfo from(FootTrafficCommercial footTrafficCommercial) {
        return CommercialDayOfWeekFootTrafficInfo.builder()
            .monFootTraffic(footTrafficCommercial.monFootTraffic())
            .tueFootTraffic(footTrafficCommercial.tueFootTraffic())
            .wedFootTraffic(footTrafficCommercial.wedFootTraffic())
            .thuFootTraffic(footTrafficCommercial.thuFootTraffic())
            .friFootTraffic(footTrafficCommercial.friFootTraffic())
            .satFootTraffic(footTrafficCommercial.satFootTraffic())
            .sunFootTraffic(footTrafficCommercial.sunFootTraffic())
            .build();
    }
}
