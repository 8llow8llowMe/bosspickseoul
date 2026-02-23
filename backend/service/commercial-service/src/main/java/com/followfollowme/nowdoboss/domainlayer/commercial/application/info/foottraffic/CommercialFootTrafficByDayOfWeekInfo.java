package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.foottraffic;

import com.followfollowme.nowdoboss.domainlayer.commercial.domain.model.FootTrafficCommercial;
import lombok.Builder;

@Builder
public record CommercialFootTrafficByDayOfWeekInfo(
    long mondayFootTraffic,
    long tuesdayFootTraffic,
    long wednesdayFootTraffic,
    long thursdayFootTraffic,
    long fridayFootTraffic,
    long saturdayFootTraffic,
    long sundayFootTraffic
) {

    public static CommercialFootTrafficByDayOfWeekInfo from(FootTrafficCommercial footTrafficCommercial) {
        return CommercialFootTrafficByDayOfWeekInfo.builder()
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
