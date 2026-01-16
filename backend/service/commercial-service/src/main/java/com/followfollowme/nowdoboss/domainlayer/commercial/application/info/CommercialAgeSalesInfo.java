package com.followfollowme.nowdoboss.domainlayer.commercial.application.info;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.SalesCommercial;
import lombok.Builder;

@Builder
public record CommercialAgeSalesInfo(
    long teenSales,
    long twentySales,
    long thirtySales,
    long fortySales,
    long fiftySales,
    long sixtySales
) {

    public static CommercialAgeSalesInfo from(SalesCommercial salesCommercial) {
        return CommercialAgeSalesInfo.builder()
            .teenSales(salesCommercial.teenSales())
            .twentySales(salesCommercial.twentySales())
            .thirtySales(salesCommercial.thirtySales())
            .fortySales(salesCommercial.fortySales())
            .fiftySales(salesCommercial.fiftySales())
            .sixtySales(salesCommercial.sixtySales())
            .build();
    }
}
