package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.SalesCommercial;
import lombok.Builder;

@Builder
public record CommercialSalesCountByGenderInfo(
    long maleSalesCount,
    long femaleSalesCount
) {

    public static CommercialSalesCountByGenderInfo from(SalesCommercial salesCommercial) {
        return CommercialSalesCountByGenderInfo.builder()
            .maleSalesCount(salesCommercial.maleSalesCount())
            .femaleSalesCount(salesCommercial.femaleSalesCount())
            .build();
    }
}
