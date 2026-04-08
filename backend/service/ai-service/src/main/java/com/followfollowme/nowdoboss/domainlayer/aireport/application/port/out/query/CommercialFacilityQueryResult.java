package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;

@JsonIgnoreProperties(ignoreUnknown = true)
@Builder
public record CommercialFacilityQueryResult(
    long totalFacilityCount,
    @JsonProperty("schoolCountItem") CommercialSchoolCountQueryResult schoolCount,
    long totalTransportationFacilityCount
) {}
