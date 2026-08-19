package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.candidate;

import lombok.Builder;

@Builder
public record BlueOceanCategoryInfo(
    String serviceCode,
    String serviceName,
    long commercialStoreCount,
    long administrationStoreCount,
    double storeRate
) {

}
