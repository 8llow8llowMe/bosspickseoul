package com.followfollowme.nowdoboss.domainlayer.commercial.application.info;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.FacilityCommercial;
import lombok.Builder;

@Builder
public record CommercialSchoolCountInfo(
    long elementarySchoolCount,
    long middleSchoolCount,
    long highSchoolCount,
    long universityCount,
    long totalSchoolCount
) {

    public static CommercialSchoolCountInfo from(FacilityCommercial facilityCommercial) {
        long total = facilityCommercial.elementarySchoolCnt() + facilityCommercial.middleSchoolCnt()
            + facilityCommercial.highSchoolCnt() + facilityCommercial.universityCnt();

        return CommercialSchoolCountInfo.builder()
            .elementarySchoolCount(facilityCommercial.elementarySchoolCnt())
            .middleSchoolCount(facilityCommercial.middleSchoolCnt())
            .highSchoolCount(facilityCommercial.highSchoolCnt())
            .universityCount(facilityCommercial.universityCnt())
            .totalSchoolCount(total)
            .build();
    }
}
