package com.followfollowme.nowdoboss.domainlayer.commercial.application.info;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.SalesCommercial;
import lombok.Builder;

@Builder
public record CommercialDaySalesInfo(
    long monSales,
    long tueSales,
    long wedSales,
    long thuSales,
    long friSales,
    long satSales,
    long sunSales
) {

    public static CommercialDaySalesInfo from(SalesCommercial salesCommercial) {
        return CommercialDaySalesInfo.builder()
            .monSales(salesCommercial.monSales())
            .tueSales(salesCommercial.tueSales())
            .wedSales(salesCommercial.wedSales())
            .thuSales(salesCommercial.thuSales())
            .friSales(salesCommercial.friSales())
            .satSales(salesCommercial.satSales())
            .sunSales(salesCommercial.sunSales())
            .build();
    }
}
