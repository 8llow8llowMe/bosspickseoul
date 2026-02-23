package com.followfollowme.nowdoboss.domainlayer.district.application.info.foottraffic;

import com.followfollowme.nowdoboss.domainlayer.district.domain.enums.DistrictAgeGroupType;
import lombok.Builder;

@Builder
public record DistrictAgeGroupFootTrafficInfo(
    long age10FootTraffic,
    long age20FootTraffic,
    long age30FootTraffic,
    long age40FootTraffic,
    long age50FootTraffic,
    long age60PlusFootTraffic,
    DistrictAgeGroupType dominantAgeGroupType
) {

}

