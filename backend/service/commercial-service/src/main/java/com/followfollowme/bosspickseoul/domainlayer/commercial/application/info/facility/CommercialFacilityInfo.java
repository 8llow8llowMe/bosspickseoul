package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.facility;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.FacilityCommercial;
import lombok.Builder;

@Builder
public record CommercialFacilityInfo(
    // 실제로 조회한 기준 분기. 요청이 분기를 생략하면 서버가 정한 기본 분기다(이슈 #464).
    String periodCode,
    long totalFacilityCount,
    CommercialSchoolCountInfo schoolCountInfo,
    long totalTransportationFacilityCount
) {

    public static CommercialFacilityInfo from(FacilityCommercial facilityCommercial) {
        return CommercialFacilityInfo.builder()
            .periodCode(facilityCommercial.periodCode())
            .totalFacilityCount(facilityCommercial.totalFacilityCount())
            .schoolCountInfo(CommercialSchoolCountInfo.from(facilityCommercial))
            .totalTransportationFacilityCount(facilityCommercial.subwayStationCount() + facilityCommercial.busStopCount())
            .build();
    }
}
