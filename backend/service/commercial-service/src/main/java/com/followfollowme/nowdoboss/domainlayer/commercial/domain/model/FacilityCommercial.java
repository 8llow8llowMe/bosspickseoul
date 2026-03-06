package com.followfollowme.nowdoboss.domainlayer.commercial.domain.model;

import lombok.Builder;

@Builder
public record FacilityCommercial(
    long id,
    String periodCode,
    String commercialClassificationCode,
    String commercialClassificationName,
    String commercialCode,
    String commercialName,
    long totalFacilityCount,
    long elementarySchoolCount,
    long middleSchoolCount,
    long highSchoolCount,
    long universityCount,
    long subwayStationCount,
    long busStopCount
) {

}
