package com.followfollowme.bosspickseoul.domainlayer.region.application.port.out.query;

import lombok.Builder;

@Builder
public record DistrictAreaQueryResult(
    String districtCode,
    String districtName
) {

}
