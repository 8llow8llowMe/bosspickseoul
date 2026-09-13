package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.district;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record DistrictChangeIndicatorClientResponse(
    String changeIndicatorCode,
    String changeIndicatorName,
    int averageOpenedMonths,
    int averageClosedMonths
) {

}
