package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import java.util.List;
import lombok.Builder;

@Builder
public record DistrictFootTrafficDetailQueryResult(
    CodeNameDescriptionMetadata periodTrend,
    List<DistrictPeriodFootTrafficQueryResult> periodTotalFootTrafficList,
    DistrictTimeSlotFootTrafficQueryResult timeSlot,
    DistrictGenderFootTrafficQueryResult gender,
    DistrictAgeGroupFootTrafficQueryResult ageGroup,
    DistrictDayOfWeekFootTrafficQueryResult dayOfWeek
) {

}
