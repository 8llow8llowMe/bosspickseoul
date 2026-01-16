package com.followfollowme.nowdoboss.domainlayer.commercial.application.info;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.FootTrafficCommercial;
import lombok.Builder;

@Builder
public record CommercialTimeSlotFootTrafficInfo(
    long footTraffic00,
    long footTraffic06,
    long footTraffic11,
    long footTraffic14,
    long footTraffic17,
    long footTraffic21
) {

    public static CommercialTimeSlotFootTrafficInfo from(FootTrafficCommercial footTrafficCommercial) {
        return CommercialTimeSlotFootTrafficInfo.builder()
            .footTraffic00(footTrafficCommercial.footTraffic00())
            .footTraffic06(footTrafficCommercial.footTraffic06())
            .footTraffic11(footTrafficCommercial.footTraffic11())
            .footTraffic14(footTrafficCommercial.footTraffic14())
            .footTraffic17(footTrafficCommercial.footTraffic17())
            .footTraffic21(footTrafficCommercial.footTraffic21())
            .build();
    }
}
