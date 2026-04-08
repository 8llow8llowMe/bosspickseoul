package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;

@JsonIgnoreProperties(ignoreUnknown = true)
@Builder
public record CommercialFootTrafficQueryResult(
    @JsonProperty("byTimeSlotItem") CommercialFootTrafficByTimeSlotQueryResult byTimeSlot,
    @JsonProperty("byDayOfWeekItem") CommercialFootTrafficByDayOfWeekQueryResult byDayOfWeek,
    @JsonProperty("byAgeGroupItem") CommercialFootTrafficByAgeGroupQueryResult byAgeGroup,
    @JsonProperty("byAgeGenderPercentItem") CommercialFootTrafficByAgeGenderPercentQueryResult byAgeGenderPercent
) {}
