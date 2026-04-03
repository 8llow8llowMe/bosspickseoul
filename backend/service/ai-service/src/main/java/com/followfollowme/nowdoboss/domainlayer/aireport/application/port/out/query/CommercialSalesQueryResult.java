package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query;

public record CommercialSalesQueryResult(
    CommercialSalesByTimeSlotQueryResult amountByTimeSlotItem,
    CommercialSalesByDayOfWeekQueryResult amountByDayOfWeekItem,
    CommercialSalesByAgeQueryResult amountByAgeItem,
    CommercialSalesByAgeGenderPercentQueryResult amountByAgeGenderPercentItem,
    CommercialSalesCountByDayOfWeekQueryResult countByDayOfWeekItem,
    CommercialSalesCountByTimeSlotQueryResult countByTimeSlotItem,
    CommercialSalesCountByGenderQueryResult countByGenderItem
) {

}

record CommercialSalesByTimeSlotQueryResult(
    long salesAmountTime00To06,
    long salesAmountTime06To11,
    long salesAmountTime11To14,
    long salesAmountTime14To17,
    long salesAmountTime17To21,
    long salesAmountTime21To24
) {}

record CommercialSalesByDayOfWeekQueryResult(
    long mondaySalesAmount,
    long tuesdaySalesAmount,
    long wednesdaySalesAmount,
    long thursdaySalesAmount,
    long fridaySalesAmount,
    long saturdaySalesAmount,
    long sundaySalesAmount
) {}

record CommercialSalesByAgeQueryResult(
    long age10SalesAmount,
    long age20SalesAmount,
    long age30SalesAmount,
    long age40SalesAmount,
    long age50SalesAmount,
    long age60PlusSalesAmount
) {}

record CommercialSalesByAgeGenderPercentQueryResult(
    double maleAge10Percent,
    double femaleAge10Percent,
    double maleAge20Percent,
    double femaleAge20Percent,
    double maleAge30Percent,
    double femaleAge30Percent,
    double maleAge40Percent,
    double femaleAge40Percent,
    double maleAge50Percent,
    double femaleAge50Percent,
    double maleAge60PlusPercent,
    double femaleAge60PlusPercent
) {}

record CommercialSalesCountByDayOfWeekQueryResult(
    long mondaySalesCount,
    long tuesdaySalesCount,
    long wednesdaySalesCount,
    long thursdaySalesCount,
    long fridaySalesCount,
    long saturdaySalesCount,
    long sundaySalesCount
) {}

record CommercialSalesCountByTimeSlotQueryResult(
    long salesCountTime00To06,
    long salesCountTime06To11,
    long salesCountTime11To14,
    long salesCountTime14To17,
    long salesCountTime17To21,
    long salesCountTime21To24
) {}

record CommercialSalesCountByGenderQueryResult(long maleSalesCount, long femaleSalesCount) {}
