package com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model;

import com.followfollowme.bosspickseoul.domainlayer.category.domain.enums.ServiceType;
import lombok.Builder;

@Builder
public record SalesCommercial(
    long id,
    String periodCode,
    String commercialClassificationCode,
    String commercialClassificationName,
    String commercialCode,
    String commercialName,
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
    long age60PlusSalesAmount,
    long mondaySalesCount,
    long tuesdaySalesCount,
    long wednesdaySalesCount,
    long thursdaySalesCount,
    long fridaySalesCount,
    long saturdaySalesCount,
    long sundaySalesCount,
    long salesCountTime00To06,
    long salesCountTime06To11,
    long salesCountTime11To14,
    long salesCountTime14To17,
    long salesCountTime17To21,
    long salesCountTime21To24,
    long maleSalesCount,
    long femaleSalesCount
) {

}
