package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.SalesCommercial;
import lombok.Builder;

@Builder
public record SalesByDayOfWeekInfo(
    long mondaySalesAmount,
    long tuesdaySalesAmount,
    long wednesdaySalesAmount,
    long thursdaySalesAmount,
    long fridaySalesAmount,
    long saturdaySalesAmount,
    long sundaySalesAmount
) {

    public static SalesByDayOfWeekInfo from(SalesCommercial salesCommercial) {
        return SalesByDayOfWeekInfo.builder()
            .mondaySalesAmount(salesCommercial.mondaySalesAmount())
            .tuesdaySalesAmount(salesCommercial.tuesdaySalesAmount())
            .wednesdaySalesAmount(salesCommercial.wednesdaySalesAmount())
            .thursdaySalesAmount(salesCommercial.thursdaySalesAmount())
            .fridaySalesAmount(salesCommercial.fridaySalesAmount())
            .saturdaySalesAmount(salesCommercial.saturdaySalesAmount())
            .sundaySalesAmount(salesCommercial.sundaySalesAmount())
            .build();
    }
}
