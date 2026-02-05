package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.SalesCommercial;
import lombok.Builder;

@Builder
public record SalesByAgeInfo(
    long age10SalesAmount,
    long age20SalesAmount,
    long age30SalesAmount,
    long age40SalesAmount,
    long age50SalesAmount,
    long age60PlusSalesAmount
) {

    public static SalesByAgeInfo from(SalesCommercial salesCommercial) {
        return SalesByAgeInfo.builder()
            .age10SalesAmount(salesCommercial.teenSales())
            .age20SalesAmount(salesCommercial.twentySales())
            .age30SalesAmount(salesCommercial.thirtySales())
            .age40SalesAmount(salesCommercial.fortySales())
            .age50SalesAmount(salesCommercial.fiftySales())
            .age60PlusSalesAmount(salesCommercial.sixtySales())
            .build();
    }
}
