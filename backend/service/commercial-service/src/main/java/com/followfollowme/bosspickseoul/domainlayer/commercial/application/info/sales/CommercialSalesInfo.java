package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.sales;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.SalesCommercial;
import lombok.Builder;

@Builder
public record CommercialSalesInfo(
    // 실제로 조회한 기준 분기. 요청이 분기를 생략하면 서버가 정한 기본 분기다(이슈 #464).
    String periodCode,
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
            .periodCode(salesCommercial.periodCode())
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
