package com.followfollowme.nowdoboss.domainlayer.region.application.info;

import lombok.Builder;

@Builder
public record DistrictAreaInfo(
    String districtCode,
    String districtName
) {

}
