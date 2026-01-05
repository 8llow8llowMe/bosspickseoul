package com.followfollowme.nowdoboss.domainlayer.commercial.application.info;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.SalesCommercial;
import lombok.Builder;

@Builder
public record CommercialDaySalesCountInfo(
    long monSalesCount,
    long tueSalesCount,
    long wedSalesCount,
    long thuSalesCount,
    long friSalesCount,
    long satSalesCount,
    long sunSalesCount
) {

    public static CommercialDaySalesCountInfo from(SalesCommercial salesCommercial) {
        return CommercialDaySalesCountInfo.builder()
            .monSalesCount(salesCommercial.monSalesCount())
            .tueSalesCount(salesCommercial.tueSalesCount())
            .wedSalesCount(salesCommercial.wedSalesCount())
            .thuSalesCount(salesCommercial.thuSalesCount())
            .friSalesCount(salesCommercial.friSalesCount())
            .satSalesCount(salesCommercial.satSalesCount())
            .sunSalesCount(salesCommercial.sunSalesCount())
            .build();
    }
}
