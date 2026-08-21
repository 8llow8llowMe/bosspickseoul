package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.foottraffic;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.FootTrafficCommercial;
import lombok.Builder;

@Builder
public record CommercialFootTrafficByAgeGroupInfo(
    long age10FootTraffic,
    long age20FootTraffic,
    long age30FootTraffic,
    long age40FootTraffic,
    long age50FootTraffic,
    long age60PlusFootTraffic
) {

    public static CommercialFootTrafficByAgeGroupInfo from(FootTrafficCommercial footTrafficCommercial) {
        return CommercialFootTrafficByAgeGroupInfo.builder()
            .age10FootTraffic(footTrafficCommercial.age10FootTraffic())
            .age20FootTraffic(footTrafficCommercial.age20FootTraffic())
            .age30FootTraffic(footTrafficCommercial.age30FootTraffic())
            .age40FootTraffic(footTrafficCommercial.age40FootTraffic())
            .age50FootTraffic(footTrafficCommercial.age50FootTraffic())
            .age60PlusFootTraffic(footTrafficCommercial.age60PlusFootTraffic())
            .build();
    }
}
