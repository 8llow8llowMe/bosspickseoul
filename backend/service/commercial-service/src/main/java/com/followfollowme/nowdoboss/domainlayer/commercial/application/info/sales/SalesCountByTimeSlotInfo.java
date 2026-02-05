package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.SalesCommercial;
import lombok.Builder;

@Builder
public record SalesCountByTimeSlotInfo(
    long salesCountTime00To06,
    long salesCountTime06To11,
    long salesCountTime11To14,
    long salesCountTime14To17,
    long salesCountTime17To21,
    long salesCountTime21To24
) {

    public static SalesCountByTimeSlotInfo from(SalesCommercial salesCommercial) {
        return SalesCountByTimeSlotInfo.builder()
            .salesCountTime00To06(salesCommercial.salesCountTime00To06())
            .salesCountTime06To11(salesCommercial.salesCountTime06To11())
            .salesCountTime11To14(salesCommercial.salesCountTime11To14())
            .salesCountTime14To17(salesCommercial.salesCountTime14To17())
            .salesCountTime17To21(salesCommercial.salesCountTime17To21())
            .salesCountTime21To24(salesCommercial.salesCountTime21To24())
            .build();
    }
}
