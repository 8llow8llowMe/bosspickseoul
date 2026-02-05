package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.FootTrafficCommercial;
import lombok.Builder;

@Builder
public record FootTrafficByDayOfWeekInfo(
    long mondayFootTraffic,
    long tuesdayFootTraffic,
    long wednesdayFootTraffic,
    long thursdayFootTraffic,
    long fridayFootTraffic,
    long saturdayFootTraffic,
    long sundayFootTraffic
) {

    public static FootTrafficByDayOfWeekInfo from(FootTrafficCommercial footTrafficCommercial) {
        return FootTrafficByDayOfWeekInfo.builder()
            .mondayFootTraffic(footTrafficCommercial.mondayFootTraffic())
            .tuesdayFootTraffic(footTrafficCommercial.tuesdayFootTraffic())
            .wednesdayFootTraffic(footTrafficCommercial.wednesdayFootTraffic())
            .thursdayFootTraffic(footTrafficCommercial.thursdayFootTraffic())
            .fridayFootTraffic(footTrafficCommercial.fridayFootTraffic())
            .saturdayFootTraffic(footTrafficCommercial.saturdayFootTraffic())
            .sundayFootTraffic(footTrafficCommercial.sundayFootTraffic())
            .build();
    }
}
