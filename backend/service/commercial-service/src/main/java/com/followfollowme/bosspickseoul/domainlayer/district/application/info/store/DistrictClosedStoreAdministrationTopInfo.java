package com.followfollowme.bosspickseoul.domainlayer.district.application.info.store;

import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.StoreAdministrationClosedTopFiveQueryResult;
import lombok.Builder;

@Builder
public record DistrictClosedStoreAdministrationTopInfo(
    String administrationCode,
    String administrationName,
    long closedStoreCount,
    double closureRate
) {

    public static DistrictClosedStoreAdministrationTopInfo from(StoreAdministrationClosedTopFiveQueryResult queryResult) {
        return new DistrictClosedStoreAdministrationTopInfo(
            queryResult.administrationCode(),
            queryResult.administrationName(),
            queryResult.closedStoreCount(),
            queryResult.closureRate()
        );
    }
}
