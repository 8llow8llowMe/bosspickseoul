package com.followfollowme.nowdoboss.domainlayer.district.application.info.foottraffic;

import com.followfollowme.nowdoboss.domainlayer.district.domain.enums.PeriodTrendType;
import java.util.List;
import lombok.Builder;

@Builder
public record DistrictFootTrafficDetailInfo(
    PeriodTrendType periodTrend,
    List<DistrictPeriodFootTrafficInfo> periodTotalFootTrafficList,
    DistrictTimeSlotFootTrafficInfo timeSlot,
    DistrictGenderFootTrafficInfo gender,
    DistrictAgeGroupFootTrafficInfo ageGroup,
    DistrictDayOfWeekFootTrafficInfo dayOfWeek
) {

}

