package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.sales;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.SalesCommercial;
import lombok.Builder;

@Builder
public record CommercialSalesByTimeSlotInfo(
    long salesAmountTime00To06,
    long salesAmountTime06To11,
    long salesAmountTime11To14,
    long salesAmountTime14To17,
    long salesAmountTime17To21,
    long salesAmountTime21To24
) {

    public static CommercialSalesByTimeSlotInfo from(SalesCommercial salesCommercial) {
        return CommercialSalesByTimeSlotInfo.builder()
            .salesAmountTime00To06(salesCommercial.salesAmountTime00To06())
            .salesAmountTime06To11(salesCommercial.salesAmountTime06To11())
            .salesAmountTime11To14(salesCommercial.salesAmountTime11To14())
            .salesAmountTime14To17(salesCommercial.salesAmountTime14To17())
            .salesAmountTime17To21(salesCommercial.salesAmountTime17To21())
            .salesAmountTime21To24(salesCommercial.salesAmountTime21To24())
            .build();
    }
}
