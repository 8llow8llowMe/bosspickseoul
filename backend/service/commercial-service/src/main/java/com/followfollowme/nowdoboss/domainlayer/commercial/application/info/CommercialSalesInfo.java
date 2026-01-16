package com.followfollowme.nowdoboss.domainlayer.commercial.application.info;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.SalesCommercial;
import lombok.Builder;

@Builder
public record CommercialSalesInfo(
    CommercialTimeSalesInfo timeSalesInfo,
    CommercialDaySalesInfo daySalesInfo,
    CommercialAgeSalesInfo ageSalesInfo,
    CommercialAgeGenderPercentSalesInfo ageGenderPercentSalesInfo,
    CommercialDaySalesCountInfo daySalesCountInfo,
    CommercialTimeSalesCountInfo timeSalesCountInfo,
    CommercialGenderSalesCountInfo genderSalesCountInfo
) {

    public static CommercialSalesInfo from(SalesCommercial salesCommercial) {
        return CommercialSalesInfo.builder()
            .timeSalesInfo(CommercialTimeSalesInfo.from(salesCommercial))
            .daySalesInfo(CommercialDaySalesInfo.from(salesCommercial))
            .ageSalesInfo(CommercialAgeSalesInfo.from(salesCommercial))
            .ageGenderPercentSalesInfo(CommercialAgeGenderPercentSalesInfo.from(salesCommercial))
            .daySalesCountInfo(CommercialDaySalesCountInfo.from(salesCommercial))
            .timeSalesCountInfo(CommercialTimeSalesCountInfo.from(salesCommercial))
            .genderSalesCountInfo(CommercialGenderSalesCountInfo.from(salesCommercial))
            .build();
    }
}
