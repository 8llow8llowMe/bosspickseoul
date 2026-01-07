package com.followfollowme.nowdoboss.domainlayer.commercial.application.info;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.FootTrafficCommercial;
import lombok.Builder;

@Builder
public record CommercialFootTrafficInfo(
    CommercialTimeSlotFootTrafficInfo timeSlotFootTraffic,
    CommercialDayOfWeekFootTrafficInfo dayOfWeekFootTraffic,
    CommercialAgeGroupFootTrafficInfo ageGroupFootTraffic,
    CommercialAgeGenderPercentFootTrafficInfo ageGenderPercentFootTraffic
) {

    public static CommercialFootTrafficInfo from(FootTrafficCommercial footTrafficCommercial) {
        return CommercialFootTrafficInfo.builder()
            .timeSlotFootTraffic(CommercialTimeSlotFootTrafficInfo.from(footTrafficCommercial))
            .dayOfWeekFootTraffic(CommercialDayOfWeekFootTrafficInfo.from(footTrafficCommercial))
            .ageGroupFootTraffic(CommercialAgeGroupFootTrafficInfo.from(footTrafficCommercial))
            .ageGenderPercentFootTraffic(CommercialAgeGenderPercentFootTrafficInfo.from(footTrafficCommercial))
            .build();
    }
}
