package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.sales;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.SalesCommercial;
import lombok.Builder;

@Builder
public record CommercialSalesByAgeInfo(
    long age10SalesAmount,
    long age20SalesAmount,
    long age30SalesAmount,
    long age40SalesAmount,
    long age50SalesAmount,
    long age60PlusSalesAmount
) {

    public static CommercialSalesByAgeInfo from(SalesCommercial salesCommercial) {
        return CommercialSalesByAgeInfo.builder()
            .age10SalesAmount(salesCommercial.age10SalesAmount())
            .age20SalesAmount(salesCommercial.age20SalesAmount())
            .age30SalesAmount(salesCommercial.age30SalesAmount())
            .age40SalesAmount(salesCommercial.age40SalesAmount())
            .age50SalesAmount(salesCommercial.age50SalesAmount())
            .age60PlusSalesAmount(salesCommercial.age60PlusSalesAmount())
            .build();
    }
}
