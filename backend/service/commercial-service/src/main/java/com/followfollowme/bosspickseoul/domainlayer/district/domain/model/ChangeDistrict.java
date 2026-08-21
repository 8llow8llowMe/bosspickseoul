package com.followfollowme.bosspickseoul.domainlayer.district.domain.model;

import lombok.Builder;

@Builder
public record ChangeDistrict(
    long id,
    String periodCode,
    String districtCode,
    String districtName,
    String changeIndicatorCode,
    String changeIndicatorName,
    int averageOpenedMonths,
    int averageClosedMonths
) {

}
