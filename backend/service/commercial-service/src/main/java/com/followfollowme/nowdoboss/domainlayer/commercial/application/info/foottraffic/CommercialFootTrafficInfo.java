package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.FootTrafficCommercial;
import lombok.Builder;

@Builder
public record CommercialFootTrafficInfo(
    CommercialFootTrafficByTimeSlotInfo byTimeSlotInfo,
    CommercialFootTrafficByDayOfWeekInfo byDayOfWeekInfo,
    CommercialFootTrafficByAgeGroupInfo byAgeGroupInfo,
    CommercialFootTrafficByAgeGenderPercentInfo byAgeGenderPercentInfo
) {

    public static CommercialFootTrafficInfo from(FootTrafficCommercial footTrafficCommercial) {
        return CommercialFootTrafficInfo.builder()
            .byTimeSlotInfo(CommercialFootTrafficByTimeSlotInfo.from(footTrafficCommercial))
            .byDayOfWeekInfo(CommercialFootTrafficByDayOfWeekInfo.from(footTrafficCommercial))
            .byAgeGroupInfo(CommercialFootTrafficByAgeGroupInfo.from(footTrafficCommercial))
            .byAgeGenderPercentInfo(CommercialFootTrafficByAgeGenderPercentInfo.from(footTrafficCommercial))
            .build();
    }
}
