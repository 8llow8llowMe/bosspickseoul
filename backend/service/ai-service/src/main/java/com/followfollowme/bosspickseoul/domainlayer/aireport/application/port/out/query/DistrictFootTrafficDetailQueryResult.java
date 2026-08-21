package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import java.util.List;
import lombok.Builder;

@JsonIgnoreProperties(ignoreUnknown = true)
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
