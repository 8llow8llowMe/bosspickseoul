package com.followfollowme.nowdoboss.domainlayer.district.application.info.store;

import com.followfollowme.nowdoboss.domainlayer.district.application.port.out.query.StoreDistrictServiceTopEightQueryResult;
import lombok.Builder;

@Builder
public record DistrictStoreServiceTopInfo(
    String serviceCode,
    String serviceName,
    long totalStoreCount
) {

    public static DistrictStoreServiceTopInfo from(StoreDistrictServiceTopEightQueryResult queryResult) {
        return new DistrictStoreServiceTopInfo(
            queryResult.serviceCode(),
            queryResult.serviceName(),
            queryResult.totalStoreCount());
    }
}

