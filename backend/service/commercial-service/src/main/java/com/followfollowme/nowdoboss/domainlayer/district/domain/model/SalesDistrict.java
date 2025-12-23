package com.followfollowme.nowdoboss.domainlayer.district.domain.model;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.enums.ServiceType;
import lombok.Builder;

@Builder
public record SalesDistrict(
    long id,
    String periodCode,
    String districtCode,
    String districtCodeName,
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
    long sixtySales
) {

}
