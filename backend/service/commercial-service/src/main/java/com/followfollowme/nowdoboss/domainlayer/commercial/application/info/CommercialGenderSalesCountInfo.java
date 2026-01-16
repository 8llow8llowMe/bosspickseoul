package com.followfollowme.nowdoboss.domainlayer.commercial.application.info;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.SalesCommercial;
import lombok.Builder;

@Builder
public record CommercialGenderSalesCountInfo(
    long maleSalesCount,
    long femaleSalesCount
) {

    public static CommercialGenderSalesCountInfo from(SalesCommercial salesCommercial) {
        return CommercialGenderSalesCountInfo.builder()
            .maleSalesCount(salesCommercial.maleSalesCount())
            .femaleSalesCount(salesCommercial.femaleSalesCount())
            .build();
    }
}
