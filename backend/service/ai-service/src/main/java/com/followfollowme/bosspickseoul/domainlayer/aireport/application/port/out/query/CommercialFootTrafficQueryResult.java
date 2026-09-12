package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import lombok.Builder;

@Builder
public record CommercialFootTrafficQueryResult(
    CommercialFootTrafficByTimeSlotQueryResult byTimeSlot,
    CommercialFootTrafficByDayOfWeekQueryResult byDayOfWeek,
    CommercialFootTrafficByAgeGroupQueryResult byAgeGroup,
    CommercialFootTrafficByAgeGenderPercentQueryResult byAgeGenderPercent
) {}
