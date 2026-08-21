package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.sales;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.SalesCommercial;
import lombok.Builder;

@Builder
public record CommercialSalesCountByDayOfWeekInfo(
    long mondaySalesCount,
    long tuesdaySalesCount,
    long wednesdaySalesCount,
    long thursdaySalesCount,
    long fridaySalesCount,
    long saturdaySalesCount,
    long sundaySalesCount
) {

    public static CommercialSalesCountByDayOfWeekInfo from(SalesCommercial salesCommercial) {
        return CommercialSalesCountByDayOfWeekInfo.builder()
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
