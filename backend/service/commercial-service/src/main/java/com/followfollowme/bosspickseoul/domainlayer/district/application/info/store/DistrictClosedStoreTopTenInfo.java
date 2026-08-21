package com.followfollowme.bosspickseoul.domainlayer.district.application.info.store;

import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.StoreDistrictClosedTopTenQueryResult;
import lombok.Builder;

@Builder
public record DistrictClosedStoreTopTenInfo(
    String districtCode,
    String districtName,
    long closedStoreCount,
    double closureChangeRate
) {

    public static DistrictClosedStoreTopTenInfo from(StoreDistrictClosedTopTenQueryResult queryResult) {
        return new DistrictClosedStoreTopTenInfo(
            queryResult.districtCode(),
            queryResult.districtName(),
            queryResult.closedStoreCount(),
            queryResult.closureChangeRate());
    }
}

