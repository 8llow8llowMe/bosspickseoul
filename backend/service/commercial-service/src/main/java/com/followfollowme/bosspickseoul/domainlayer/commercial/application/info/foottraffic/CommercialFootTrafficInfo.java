package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.foottraffic;

import com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model.FootTrafficCommercial;
import lombok.Builder;

@Builder
public record CommercialFootTrafficInfo(
    // 실제로 조회한 기준 분기. 요청이 분기를 생략하면 서버가 정한 기본 분기다(이슈 #464).
    String periodCode,
    // 인기 순위 이벤트에 상권명을 실어 보내기 위한 필드. 응답 DTO 에는 노출하지 않는다.
    String commercialName,
    CommercialFootTrafficByTimeSlotInfo byTimeSlotInfo,
    CommercialFootTrafficByDayOfWeekInfo byDayOfWeekInfo,
    CommercialFootTrafficByAgeGroupInfo byAgeGroupInfo,
    CommercialFootTrafficByAgeGenderPercentInfo byAgeGenderPercentInfo
) {

    public static CommercialFootTrafficInfo from(FootTrafficCommercial footTrafficCommercial) {
        return CommercialFootTrafficInfo.builder()
            .periodCode(footTrafficCommercial.periodCode())
            .commercialName(footTrafficCommercial.commercialName())
            .byTimeSlotInfo(CommercialFootTrafficByTimeSlotInfo.from(footTrafficCommercial))
            .byDayOfWeekInfo(CommercialFootTrafficByDayOfWeekInfo.from(footTrafficCommercial))
            .byAgeGroupInfo(CommercialFootTrafficByAgeGroupInfo.from(footTrafficCommercial))
            .byAgeGenderPercentInfo(CommercialFootTrafficByAgeGenderPercentInfo.from(footTrafficCommercial))
            .build();
    }
}
