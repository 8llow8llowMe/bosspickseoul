package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.foottraffic;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.FootTrafficCommercial;
import lombok.Builder;

@Builder
public record CommercialFootTrafficByTimeSlotInfo(
    long footTrafficTime00To06,
    long footTrafficTime06To11,
    long footTrafficTime11To14,
    long footTrafficTime14To17,
    long footTrafficTime17To21,
    long footTrafficTime21To24
) {

    public static CommercialFootTrafficByTimeSlotInfo from(FootTrafficCommercial footTrafficCommercial) {
        return CommercialFootTrafficByTimeSlotInfo.builder()
            .footTrafficTime00To06(footTrafficCommercial.footTrafficTime00To06())
            .footTrafficTime06To11(footTrafficCommercial.footTrafficTime06To11())
            .footTrafficTime11To14(footTrafficCommercial.footTrafficTime11To14())
            .footTrafficTime14To17(footTrafficCommercial.footTrafficTime14To17())
            .footTrafficTime17To21(footTrafficCommercial.footTrafficTime17To21())
            .footTrafficTime21To24(footTrafficCommercial.footTrafficTime21To24())
            .build();
    }
}
