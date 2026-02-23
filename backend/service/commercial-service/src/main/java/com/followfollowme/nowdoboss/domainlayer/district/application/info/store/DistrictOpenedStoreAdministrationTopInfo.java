package com.followfollowme.nowdoboss.domainlayer.district.application.info.store;

import com.followfollowme.nowdoboss.domainlayer.district.application.port.out.query.StoreAdministrationOpenedTopFiveQueryResult;
import lombok.Builder;

@Builder
public record DistrictOpenedStoreAdministrationTopInfo(
    String administrationCode,
    String administrationName,
    long openedStoreCount,
    double openingRate
) {

    public static DistrictOpenedStoreAdministrationTopInfo from(StoreAdministrationOpenedTopFiveQueryResult queryResult) {
        return new DistrictOpenedStoreAdministrationTopInfo(
            queryResult.administrationCode(),
            queryResult.administrationName(),
            queryResult.openedStoreCount(),
            queryResult.openingRate()
        );
    }
}
