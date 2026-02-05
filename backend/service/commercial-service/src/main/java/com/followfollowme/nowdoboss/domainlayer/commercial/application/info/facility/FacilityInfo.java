package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.facility;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.FacilityCommercial;
import lombok.Builder;

@Builder
public record FacilityInfo(
    long totalFacilityCount,
    SchoolCountInfo schoolCountInfo,
    long totalTransportationFacilityCount
) {

    public static FacilityInfo from(FacilityCommercial facilityCommercial) {
        return FacilityInfo.builder()
            .totalFacilityCount(facilityCommercial.facilityCount())
            .schoolCountInfo(SchoolCountInfo.from(facilityCommercial))
            .totalTransportationFacilityCount(facilityCommercial.subwayStationCount() + facilityCommercial.busStopCount())
            .build();
    }
}
