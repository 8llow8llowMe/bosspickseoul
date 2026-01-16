package com.followfollowme.nowdoboss.domainlayer.commercial.domain.model;

import com.followfollowme.nowdoboss.domainlayer.category.domain.enums.ServiceType;
import lombok.Builder;

@Builder
public record SalesCommercial(
    long id,
    String periodCode,
    String commercialClassificationCode,
    String commercialClassificationCodeName,
    String commercialCode,
    String commercialCodeName,
    String serviceCode,
    String serviceCodeName,
    ServiceType serviceType,
    long monthSales,
    long monSales,
    long tueSales,
    long wedSales,
    long thuSales,
    long friSales,
    long satSales,
    long sunSales,
    long sales00,
    long sales06,
    long sales11,
    long sales14,
    long sales17,
    long sales21,
    long maleSales,
    long femaleSales,
    long teenSales,
    long twentySales,
    long thirtySales,
    long fortySales,
    long fiftySales,
    long sixtySales,
    long monSalesCount,
    long tueSalesCount,
    long wedSalesCount,
    long thuSalesCount,
    long friSalesCount,
    long satSalesCount,
    long sunSalesCount,
    long salesCount00,
    long salesCount06,
    long salesCount11,
    long salesCount14,
    long salesCount17,
    long salesCount21,
    long maleSalesCount,
    long femaleSalesCount
) {

}
