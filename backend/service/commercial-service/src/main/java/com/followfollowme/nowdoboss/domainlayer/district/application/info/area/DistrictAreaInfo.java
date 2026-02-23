package com.followfollowme.nowdoboss.domainlayer.district.application.info.area;

import com.followfollowme.nowdoboss.domainlayer.district.application.port.out.query.DistrictAreaQueryResult;
import lombok.Builder;

@Builder
public record DistrictAreaInfo(
    String districtCode,
    String districtName
) {

    public static DistrictAreaInfo from(DistrictAreaQueryResult queryResult) {
        return new DistrictAreaInfo(queryResult.districtCode(), queryResult.districtName());
    }
}

