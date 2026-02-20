package com.followfollowme.nowdoboss.domainlayer.district.application.info.change;

import lombok.Builder;

@Builder
public record DistrictChangeIndicatorInfo(
    String changeIndicatorCode,
    String changeIndicatorName,
    int averageOpenedMonths,
    int averageClosedMonths
) {

}

