package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.facility;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.FacilityCommercial;
import lombok.Builder;

@Builder
public record CommercialFacilityInfo(
    long totalFacilityCount,
    CommercialSchoolCountInfo schoolCountInfo,
    long totalTransportationFacilityCount
) {

    public static CommercialFacilityInfo from(FacilityCommercial facilityCommercial) {
        return CommercialFacilityInfo.builder()
            .totalFacilityCount(facilityCommercial.facilityCount())
            .schoolCountInfo(CommercialSchoolCountInfo.from(facilityCommercial))
            .totalTransportationFacilityCount(facilityCommercial.subwayStationCount() + facilityCommercial.busStopCount())
            .build();
    }
}
