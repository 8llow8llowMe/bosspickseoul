package com.followfollowme.nowdoboss.domainlayer.district.application.info.foottraffic;

import com.followfollowme.nowdoboss.domainlayer.district.domain.enums.DistrictDayOfWeekType;
import lombok.Builder;

@Builder
public record DistrictDayOfWeekFootTrafficInfo(
    long mondayFootTraffic,
    long tuesdayFootTraffic,
    long wednesdayFootTraffic,
    long thursdayFootTraffic,
    long fridayFootTraffic,
    long saturdayFootTraffic,
    long sundayFootTraffic,
    DistrictDayOfWeekType dominantDayOfWeekType
) {

}

