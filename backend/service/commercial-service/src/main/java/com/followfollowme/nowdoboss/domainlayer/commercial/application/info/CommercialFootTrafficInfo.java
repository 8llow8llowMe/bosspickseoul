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

    public static CommercialFootTrafficInfo from(FootTrafficCommercial footTraffic) {
        return CommercialFootTrafficInfo.builder()
            .timeSlotFootTraffic(CommercialTimeSlotFootTrafficInfo.from(footTraffic))
            .dayOfWeekFootTraffic(CommercialDayOfWeekFootTrafficInfo.from(footTraffic))
            .ageGroupFootTraffic(CommercialAgeGroupFootTrafficInfo.from(footTraffic))
            .ageGenderPercentFootTraffic(CommercialAgeGenderPercentFootTrafficInfo.from(footTraffic))
            .build();
    }
}
