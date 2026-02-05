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
            .salesCountTime00To06(salesCommercial.salesCount00())
            .salesCountTime06To11(salesCommercial.salesCount06())
            .salesCountTime11To14(salesCommercial.salesCount11())
            .salesCountTime14To17(salesCommercial.salesCount14())
            .salesCountTime17To21(salesCommercial.salesCount17())
            .salesCountTime21To24(salesCommercial.salesCount21())
            .build();
    }
}
