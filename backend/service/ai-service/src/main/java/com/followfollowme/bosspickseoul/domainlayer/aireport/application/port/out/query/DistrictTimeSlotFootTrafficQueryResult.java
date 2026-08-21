package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import lombok.Builder;

@JsonIgnoreProperties(ignoreUnknown = true)
@Builder
public record DistrictTimeSlotFootTrafficQueryResult(
    long footTrafficTime00To06,
    long footTrafficTime06To11,
    long footTrafficTime11To14,
    long footTrafficTime14To17,
    long footTrafficTime17To21,
    long footTrafficTime21To24,
    CodeNameDescriptionMetadata dominantTimeSlotType
) {

}
