package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.SalesCommercial;
import lombok.Builder;

@Builder
public record SalesCountByDayOfWeekInfo(
    long mondaySalesCount,
    long tuesdaySalesCount,
    long wednesdaySalesCount,
    long thursdaySalesCount,
    long fridaySalesCount,
    long saturdaySalesCount,
    long sundaySalesCount
) {

    public static SalesCountByDayOfWeekInfo from(SalesCommercial salesCommercial) {
        return SalesCountByDayOfWeekInfo.builder()
            .mondaySalesCount(salesCommercial.mondaySalesCount())
            .tuesdaySalesCount(salesCommercial.tuesdaySalesCount())
            .wednesdaySalesCount(salesCommercial.wednesdaySalesCount())
            .thursdaySalesCount(salesCommercial.thursdaySalesCount())
            .fridaySalesCount(salesCommercial.fridaySalesCount())
            .saturdaySalesCount(salesCommercial.saturdaySalesCount())
            .sundaySalesCount(salesCommercial.sundaySalesCount())
            .build();
    }
}
