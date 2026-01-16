package com.followfollowme.nowdoboss.domainlayer.commercial.application.info;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.FootTrafficCommercial;
import lombok.Builder;

@Builder
public record CommercialFootTrafficInfo(
    CommercialTimeSlotFootTrafficInfo timeSlotFootTrafficInfo,
    CommercialDayOfWeekFootTrafficInfo dayOfWeekFootTrafficInfo,
    CommercialAgeGroupFootTrafficInfo ageGroupFootTrafficInfo,
    CommercialAgeGenderPercentFootTrafficInfo ageGenderPercentFootTrafficInfo
) {

    public static CommercialFootTrafficInfo from(FootTrafficCommercial footTrafficCommercial) {
        return CommercialFootTrafficInfo.builder()
            .timeSlotFootTrafficInfo(CommercialTimeSlotFootTrafficInfo.from(footTrafficCommercial))
            .dayOfWeekFootTrafficInfo(CommercialDayOfWeekFootTrafficInfo.from(footTrafficCommercial))
            .ageGroupFootTrafficInfo(CommercialAgeGroupFootTrafficInfo.from(footTrafficCommercial))
            .ageGenderPercentFootTrafficInfo(CommercialAgeGenderPercentFootTrafficInfo.from(footTrafficCommercial))
            .build();
    }
}
