package com.followfollowme.bosspickseoul.domainlayer.region.application.info;

import com.followfollowme.bosspickseoul.domainlayer.region.application.port.out.query.DistrictAreaQueryResult;
import lombok.Builder;

@Builder
public record DistrictAreaInfo(
    String districtCode,
    String districtName
) {

    public static DistrictAreaInfo from(DistrictAreaQueryResult result) {
        return DistrictAreaInfo.builder()
            .districtCode(result.districtCode())
            .districtName(result.districtName())
            .build();
    }
}
