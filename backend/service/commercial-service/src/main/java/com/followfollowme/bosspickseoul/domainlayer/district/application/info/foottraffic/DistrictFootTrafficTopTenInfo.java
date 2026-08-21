package com.followfollowme.bosspickseoul.domainlayer.district.application.info.foottraffic;

import com.followfollowme.bosspickseoul.domainlayer.district.application.port.out.query.FootTrafficDistrictTopTenQueryResult;
import lombok.Builder;

@Builder
public record DistrictFootTrafficTopTenInfo(
    String districtCode,
    String districtName,
    long totalFootTraffic,
    double footTrafficChangeRate
) {

    public static DistrictFootTrafficTopTenInfo from(FootTrafficDistrictTopTenQueryResult queryResult) {
        return new DistrictFootTrafficTopTenInfo(
            queryResult.districtCode(),
            queryResult.districtName(),
            queryResult.totalFootTraffic(),
            queryResult.footTrafficChangeRate());
    }
}

