package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.SalesCommercial;
import lombok.Builder;

@Builder
public record SalesByTimeSlotInfo(
    long salesAmountTime00To06,
    long salesAmountTime06To11,
    long salesAmountTime11To14,
    long salesAmountTime14To17,
    long salesAmountTime17To21,
    long salesAmountTime21To24
) {

    public static SalesByTimeSlotInfo from(SalesCommercial salesCommercial) {
        return SalesByTimeSlotInfo.builder()
            .salesAmountTime00To06(salesCommercial.sales00())
            .salesAmountTime06To11(salesCommercial.sales06())
            .salesAmountTime11To14(salesCommercial.sales11())
            .salesAmountTime14To17(salesCommercial.sales14())
            .salesAmountTime17To21(salesCommercial.sales17())
            .salesAmountTime21To24(salesCommercial.sales21())
            .build();
    }
}
