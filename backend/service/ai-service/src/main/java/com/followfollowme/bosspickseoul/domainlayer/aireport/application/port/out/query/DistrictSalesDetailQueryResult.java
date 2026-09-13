package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import java.util.List;
import lombok.Builder;

@Builder
public record DistrictSalesDetailQueryResult(
    List<DistrictSalesServiceTopQueryResult> topSalesServices,
    List<DistrictSalesAdministrationTopQueryResult> topSalesAdministrations
) {

}

