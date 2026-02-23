package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.facility;

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
        long total = facilityCommercial.elementarySchoolCount() + facilityCommercial.middleSchoolCnt()
            + facilityCommercial.highSchoolCount() + facilityCommercial.universityCount();

        return CommercialSchoolCountInfo.builder()
            .elementarySchoolCount(facilityCommercial.elementarySchoolCount())
            .middleSchoolCount(facilityCommercial.middleSchoolCnt())
            .highSchoolCount(facilityCommercial.highSchoolCount())
            .universityCount(facilityCommercial.universityCount())
            .totalSchoolCount(total)
            .build();
    }
}
