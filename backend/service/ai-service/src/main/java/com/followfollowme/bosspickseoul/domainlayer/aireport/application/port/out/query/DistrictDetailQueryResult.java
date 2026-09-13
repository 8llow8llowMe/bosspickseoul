package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import lombok.Builder;

@Builder
public record DistrictDetailQueryResult(
    DistrictChangeIndicatorQueryResult changeIndicator,
    DistrictFootTrafficDetailQueryResult footTraffic,
    DistrictStoreDetailQueryResult store,
    DistrictSalesDetailQueryResult sales
) {

}

