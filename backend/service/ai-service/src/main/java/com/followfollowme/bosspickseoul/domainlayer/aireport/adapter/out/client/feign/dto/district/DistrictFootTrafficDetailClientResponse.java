package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.district;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import java.util.List;

/**
 * {@code CodeNameDescriptionMetadata} 는 peer 소유 모양이 아니라 common-core 가 양쪽 서비스에 공통으로
 * 제공하는 스키마라 wire 쪽에도 그대로 둔다. peer 가 혼자 리네임할 수 있는 대상이 아니다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record DistrictFootTrafficDetailClientResponse(
    CodeNameDescriptionMetadata periodTrend,
    List<DistrictPeriodFootTrafficClientResponse> periodTotalFootTrafficList,
    DistrictTimeSlotFootTrafficClientResponse timeSlot,
    DistrictGenderFootTrafficClientResponse gender,
    DistrictAgeGroupFootTrafficClientResponse ageGroup,
    DistrictDayOfWeekFootTrafficClientResponse dayOfWeek
) {

}
