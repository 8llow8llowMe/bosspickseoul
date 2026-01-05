package com.followfollowme.nowdoboss.domainlayer.commercial.application.info;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.SalesCommercial;
import lombok.Builder;

@Builder
public record CommercialTimeSalesCountInfo(
    long salesCount00,
    long salesCount06,
    long salesCount11,
    long salesCount14,
    long salesCount17,
    long salesCount21
) {

    public static CommercialTimeSalesCountInfo from(SalesCommercial salesCommercial) {
        return CommercialTimeSalesCountInfo.builder()
            .salesCount00(salesCommercial.salesCount00())
            .salesCount06(salesCommercial.salesCount06())
            .salesCount11(salesCommercial.salesCount11())
            .salesCount14(salesCommercial.salesCount14())
            .salesCount17(salesCommercial.salesCount17())
            .salesCount21(salesCommercial.salesCount21())
            .build();
    }
}
