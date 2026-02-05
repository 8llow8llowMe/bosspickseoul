package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.FootTrafficCommercial;
import lombok.Builder;

@Builder
public record FootTrafficInfo(
    FootTrafficByTimeSlotInfo byTimeSlotInfo,
    FootTrafficByDayOfWeekInfo byDayOfWeekInfo,
    FootTrafficByAgeGroupInfo byAgeGroupInfo,
    FootTrafficByAgeGenderPercentInfo byAgeGenderPercentInfo
) {

    public static FootTrafficInfo from(FootTrafficCommercial footTrafficCommercial) {
        return FootTrafficInfo.builder()
            .byTimeSlotInfo(FootTrafficByTimeSlotInfo.from(footTrafficCommercial))
            .byDayOfWeekInfo(FootTrafficByDayOfWeekInfo.from(footTrafficCommercial))
            .byAgeGroupInfo(FootTrafficByAgeGroupInfo.from(footTrafficCommercial))
            .byAgeGenderPercentInfo(FootTrafficByAgeGenderPercentInfo.from(footTrafficCommercial))
            .build();
    }
}
