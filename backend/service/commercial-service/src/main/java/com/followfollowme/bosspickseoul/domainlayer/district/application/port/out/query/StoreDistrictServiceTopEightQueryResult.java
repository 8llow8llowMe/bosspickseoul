package com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query;

import lombok.Builder;

@Builder
public record StoreDistrictServiceTopEightQueryResult(
    String serviceCode,
    String serviceName,
    long totalStoreCount
) {

}
