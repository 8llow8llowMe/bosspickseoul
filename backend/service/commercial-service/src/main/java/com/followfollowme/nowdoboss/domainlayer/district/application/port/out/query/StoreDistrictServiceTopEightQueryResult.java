package com.followfollowme.nowdoboss.domainlayer.district.application.port.out.query;

import lombok.Builder;

@Builder
public record StoreDistrictServiceTopEightQueryResult(
    String serviceCode,
    String serviceName,
    long totalStoreCount
) {

}
