package com.followfollowme.nowdoboss.domainlayer.commercial.application.info;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.SalesCommercial;
import lombok.Builder;

@Builder
public record CommercialTimeSalesInfo(
    long sales00,
    long sales06,
    long sales11,
    long sales14,
    long sales17,
    long sales21
) {

    public static CommercialTimeSalesInfo from(SalesCommercial salesCommercial) {
        return CommercialTimeSalesInfo.builder()
            .sales00(salesCommercial.sales00())
            .sales06(salesCommercial.sales06())
            .sales11(salesCommercial.sales11())
            .sales14(salesCommercial.sales14())
            .sales17(salesCommercial.sales17())
            .sales21(salesCommercial.sales21())
            .build();
    }
}
