package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import lombok.Builder;

@Builder
public record CommercialSalesQueryResult(
    CommercialSalesByTimeSlotQueryResult amountByTimeSlot,
    CommercialSalesByDayOfWeekQueryResult amountByDayOfWeek,
    CommercialSalesByAgeQueryResult amountByAge,
    CommercialSalesByAgeGenderPercentQueryResult amountByAgeGenderPercent,
    CommercialSalesCountByDayOfWeekQueryResult countByDayOfWeek,
    CommercialSalesCountByTimeSlotQueryResult countByTimeSlot,
    CommercialSalesCountByGenderQueryResult countByGender
) {}
