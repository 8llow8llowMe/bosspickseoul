package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.SalesCommercial;
import lombok.Builder;

@Builder
public record SalesInfo(
    SalesByTimeSlotInfo amountByTimeSlotInfo,
    SalesByDayOfWeekInfo amountByDayOfWeekInfo,
    SalesByAgeInfo amountByAgeInfo,
    SalesByAgeGenderPercentInfo amountByAgeGenderPercentInfo,
    SalesCountByDayOfWeekInfo countByDayOfWeekInfo,
    SalesCountByTimeSlotInfo countByTimeSlotInfo,
    SalesCountByGenderInfo countByGenderInfo
) {

    public static SalesInfo from(SalesCommercial salesCommercial) {
        return SalesInfo.builder()
            .amountByTimeSlotInfo(SalesByTimeSlotInfo.from(salesCommercial))
            .amountByDayOfWeekInfo(SalesByDayOfWeekInfo.from(salesCommercial))
            .amountByAgeInfo(SalesByAgeInfo.from(salesCommercial))
            .amountByAgeGenderPercentInfo(SalesByAgeGenderPercentInfo.from(salesCommercial))
            .countByDayOfWeekInfo(SalesCountByDayOfWeekInfo.from(salesCommercial))
            .countByTimeSlotInfo(SalesCountByTimeSlotInfo.from(salesCommercial))
            .countByGenderInfo(SalesCountByGenderInfo.from(salesCommercial))
            .build();
    }
}
