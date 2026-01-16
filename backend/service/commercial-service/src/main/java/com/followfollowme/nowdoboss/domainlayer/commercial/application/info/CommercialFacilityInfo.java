package com.followfollowme.nowdoboss.domainlayer.commercial.application.info;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.FacilityCommercial;
import lombok.Builder;

@Builder
public record CommercialFacilityInfo(
    long facilityCount,
    CommercialSchoolCountInfo schoolCountInfo,
    long transportCount
) {

    public static CommercialFacilityInfo from(FacilityCommercial facilityCommercial) {
        return CommercialFacilityInfo.builder()
            .facilityCount(facilityCommercial.facilityCnt())
            .schoolCountInfo(CommercialSchoolCountInfo.from(facilityCommercial))
            .transportCount(facilityCommercial.subwayStationCnt() + facilityCommercial.busStopCnt())
            .build();
    }
}
