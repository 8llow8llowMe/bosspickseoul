package com.followfollowme.bosspickseoul.domainlayer.district.application.info.foottraffic;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import java.util.List;
import lombok.Builder;

@Builder
public record DistrictFootTrafficDetailInfo(
    CodeNameDescriptionMetadata periodTrend,
    List<DistrictPeriodFootTrafficInfo> periodTotalFootTrafficList,
    DistrictTimeSlotFootTrafficInfo timeSlot,
    DistrictGenderFootTrafficInfo gender,
    DistrictAgeGroupFootTrafficInfo ageGroup,
    DistrictDayOfWeekFootTrafficInfo dayOfWeek
) {

}
