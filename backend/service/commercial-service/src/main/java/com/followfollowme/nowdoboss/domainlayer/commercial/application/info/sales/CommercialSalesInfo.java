package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.sales;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.SalesCommercial;
import lombok.Builder;

@Builder
public record CommercialSalesInfo(
    String commercialName,
    CommercialSalesByTimeSlotInfo amountByTimeSlotInfo,
    CommercialSalesByDayOfWeekInfo amountByDayOfWeekInfo,
    CommercialSalesByAgeInfo amountByAgeInfo,
    CommercialSalesByAgeGenderPercentInfo amountByAgeGenderPercentInfo,
    CommercialSalesCountByDayOfWeekInfo countByDayOfWeekInfo,
    CommercialSalesCountByTimeSlotInfo countByTimeSlotInfo,
    CommercialSalesCountByGenderInfo countByGenderInfo
) {

    public static CommercialSalesInfo from(SalesCommercial salesCommercial) {
        return CommercialSalesInfo.builder()
            .commercialName(salesCommercial.commercialName())
            .amountByTimeSlotInfo(CommercialSalesByTimeSlotInfo.from(salesCommercial))
            .amountByDayOfWeekInfo(CommercialSalesByDayOfWeekInfo.from(salesCommercial))
            .amountByAgeInfo(CommercialSalesByAgeInfo.from(salesCommercial))
            .amountByAgeGenderPercentInfo(CommercialSalesByAgeGenderPercentInfo.from(salesCommercial))
            .countByDayOfWeekInfo(CommercialSalesCountByDayOfWeekInfo.from(salesCommercial))
            .countByTimeSlotInfo(CommercialSalesCountByTimeSlotInfo.from(salesCommercial))
            .countByGenderInfo(CommercialSalesCountByGenderInfo.from(salesCommercial))
            .build();
    }
}
