package com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query;

import lombok.Builder;

@Builder
public record DistrictAreaQueryResult(
    String districtCode,
    String districtName
) {

}
