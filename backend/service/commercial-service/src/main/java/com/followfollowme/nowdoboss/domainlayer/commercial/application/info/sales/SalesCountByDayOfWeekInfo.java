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
            .mondaySalesCount(salesCommercial.monSalesCount())
            .tuesdaySalesCount(salesCommercial.tueSalesCount())
            .wednesdaySalesCount(salesCommercial.wedSalesCount())
            .thursdaySalesCount(salesCommercial.thuSalesCount())
            .fridaySalesCount(salesCommercial.friSalesCount())
            .saturdaySalesCount(salesCommercial.satSalesCount())
            .sundaySalesCount(salesCommercial.sunSalesCount())
            .build();
    }
}
