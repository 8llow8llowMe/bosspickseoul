package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Builder;

@JsonIgnoreProperties(ignoreUnknown = true)
@Builder
public record DistrictDetailQueryResult(
    DistrictChangeIndicatorQueryResult changeIndicator,
    DistrictFootTrafficDetailQueryResult footTraffic,
    DistrictStoreDetailQueryResult store,
    DistrictSalesDetailQueryResult sales
) {

}

