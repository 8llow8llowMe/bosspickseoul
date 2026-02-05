package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.FootTrafficCommercial;
import lombok.Builder;

@Builder
public record FootTrafficByTimeSlotInfo(
    long footTrafficTime00To06,
    long footTrafficTime06To11,
    long footTrafficTime11To14,
    long footTrafficTime14To17,
    long footTrafficTime17To21,
    long footTrafficTime21To24
) {

    public static FootTrafficByTimeSlotInfo from(FootTrafficCommercial footTrafficCommercial) {
        return FootTrafficByTimeSlotInfo.builder()
            .footTrafficTime00To06(footTrafficCommercial.footTrafficTime00To06())
            .footTrafficTime06To11(footTrafficCommercial.footTrafficTime06To11())
            .footTrafficTime11To14(footTrafficCommercial.footTrafficTime11To14())
            .footTrafficTime14To17(footTrafficCommercial.footTrafficTime14To17())
            .footTrafficTime17To21(footTrafficCommercial.footTrafficTime17To21())
            .footTrafficTime21To24(footTrafficCommercial.footTrafficTime21To24())
            .build();
    }
}
