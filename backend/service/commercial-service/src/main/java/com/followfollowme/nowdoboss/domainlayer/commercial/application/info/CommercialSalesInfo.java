package com.followfollowme.nowdoboss.domainlayer.commercial.application.info;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.SalesCommercial;
import lombok.Builder;

@Builder
public record CommercialSalesInfo(
    CommercialTimeSalesInfo timeSales,
    CommercialDaySalesInfo daySales,
    CommercialAgeSalesInfo ageSales,
    CommercialAgeGenderPercentSalesInfo ageGenderPercentSales,
    CommercialDaySalesCountInfo daySalesCount,
    CommercialTimeSalesCountInfo timeSalesCount,
    CommercialGenderSalesCountInfo genderSalesCount
) {

    public static CommercialSalesInfo from(SalesCommercial salesCommercial) {
        return CommercialSalesInfo.builder()
            .timeSales(CommercialTimeSalesInfo.from(salesCommercial))
            .daySales(CommercialDaySalesInfo.from(salesCommercial))
            .ageSales(CommercialAgeSalesInfo.from(salesCommercial))
            .ageGenderPercentSales(CommercialAgeGenderPercentSalesInfo.from(salesCommercial))
            .daySalesCount(CommercialDaySalesCountInfo.from(salesCommercial))
            .timeSalesCount(CommercialTimeSalesCountInfo.from(salesCommercial))
            .genderSalesCount(CommercialGenderSalesCountInfo.from(salesCommercial))
            .build();
    }
}
