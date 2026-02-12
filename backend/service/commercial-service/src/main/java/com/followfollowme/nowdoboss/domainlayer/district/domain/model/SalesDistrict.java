package com.followfollowme.nowdoboss.domainlayer.district.domain.model;

import com.followfollowme.nowdoboss.domainlayer.category.domain.enums.ServiceType;
import lombok.Builder;

@Builder
public record SalesDistrict(
    long id,
    String periodCode,
    String districtCode,
    String districtName,
    String serviceCode,
    String serviceName,
    ServiceType serviceType,
    long monthlySalesAmount,
    long mondaySalesAmount,
    long tuesdaySalesAmount,
    long wednesdaySalesAmount,
    long thursdaySalesAmount,
    long fridaySalesAmount,
    long saturdaySalesAmount,
    long sundaySalesAmount,
    long salesAmountTime00To06,
    long salesAmountTime06To11,
    long salesAmountTime11To14,
    long salesAmountTime14To17,
    long salesAmountTime17To21,
    long salesAmountTime21To24,
    long maleSalesAmount,
    long femaleSalesAmount,
    long age10SalesAmount,
    long age20SalesAmount,
    long age30SalesAmount,
    long age40SalesAmount,
    long age50SalesAmount,
    long age60PlusSalesAmount
) {

}
