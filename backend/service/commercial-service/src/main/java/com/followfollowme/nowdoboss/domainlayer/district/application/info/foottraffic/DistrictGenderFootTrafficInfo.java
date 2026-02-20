package com.followfollowme.nowdoboss.domainlayer.district.application.info.foottraffic;

import com.followfollowme.nowdoboss.domainlayer.district.domain.enums.DistrictGenderType;
import lombok.Builder;

@Builder
public record DistrictGenderFootTrafficInfo(
    long maleFootTraffic,
    long femaleFootTraffic,
    DistrictGenderType dominantGenderType
) {

}

