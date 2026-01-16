package com.followfollowme.nowdoboss.domainlayer.commercial.domain.model;

import lombok.Builder;

@Builder
public record FacilityCommercial(
    long id,
    String periodCode,
    String commercialClassificationCode,
    String commercialClassificationCodeName,
    String commercialCode,
    String commercialCodeName,
    long facilityCnt,
    long elementarySchoolCnt,
    long middleSchoolCnt,
    long highSchoolCnt,
    long universityCnt,
    long subwayStationCnt,
    long busStopCnt
) {

}
