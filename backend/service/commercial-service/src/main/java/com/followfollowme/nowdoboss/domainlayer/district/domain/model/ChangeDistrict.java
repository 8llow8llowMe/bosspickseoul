package com.followfollowme.nowdoboss.domainlayer.district.domain.model;

import lombok.Builder;

@Builder
public record ChangeDistrict(
    long id,
    String periodCode,
    String districtCode,
    String districtCodeName,
    String changeIndicator,
    String changeIndicatorName,
    int openedMonths,
    int closedMonths
) {

}
