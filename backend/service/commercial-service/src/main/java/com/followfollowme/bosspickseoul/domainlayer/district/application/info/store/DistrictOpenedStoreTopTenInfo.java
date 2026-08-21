package com.followfollowme.bosspickseoul.domainlayer.district.application.info.store;

import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.StoreDistrictOpenedTopTenQueryResult;
import lombok.Builder;

@Builder
public record DistrictOpenedStoreTopTenInfo(
    String districtCode,
    String districtName,
    long openedStoreCount,
    double openingChangeRate
) {

    public static DistrictOpenedStoreTopTenInfo from(StoreDistrictOpenedTopTenQueryResult queryResult) {
        return new DistrictOpenedStoreTopTenInfo(
            queryResult.districtCode(),
            queryResult.districtName(),
            queryResult.openedStoreCount(),
            queryResult.openingChangeRate());
    }
}

