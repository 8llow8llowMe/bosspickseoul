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
            .mondaySalesAmount(salesCommercial.monSales())
            .tuesdaySalesAmount(salesCommercial.tueSales())
            .wednesdaySalesAmount(salesCommercial.wedSales())
            .thursdaySalesAmount(salesCommercial.thuSales())
            .fridaySalesAmount(salesCommercial.friSales())
            .saturdaySalesAmount(salesCommercial.satSales())
            .sundaySalesAmount(salesCommercial.sunSales())
            .build();
    }
}
