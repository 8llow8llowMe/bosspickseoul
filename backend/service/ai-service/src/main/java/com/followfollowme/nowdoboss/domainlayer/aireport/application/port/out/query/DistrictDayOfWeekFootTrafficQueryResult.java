package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescriptionMetadata;
import lombok.Builder;

@JsonIgnoreProperties(ignoreUnknown = true)
@Builder
public record DistrictDayOfWeekFootTrafficQueryResult(
    long mondayFootTraffic,
    long tuesdayFootTraffic,
    long wednesdayFootTraffic,
    long thursdayFootTraffic,
    long fridayFootTraffic,
    long saturdayFootTraffic,
    long sundayFootTraffic,
    CodeNameDescriptionMetadata dominantDayOfWeekType
) {

}
