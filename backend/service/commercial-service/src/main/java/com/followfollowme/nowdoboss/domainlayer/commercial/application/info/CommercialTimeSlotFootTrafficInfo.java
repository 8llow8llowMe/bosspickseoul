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

    public static CommercialTimeSlotFootTrafficInfo from(FootTrafficCommercial footTraffic) {
        return CommercialTimeSlotFootTrafficInfo.builder()
            .footTraffic00(footTraffic.footTraffic00())
            .footTraffic06(footTraffic.footTraffic06())
            .footTraffic11(footTraffic.footTraffic11())
            .footTraffic14(footTraffic.footTraffic14())
            .footTraffic17(footTraffic.footTraffic17())
            .footTraffic21(footTraffic.footTraffic21())
            .build();
    }
}
