package com.followfollowme.bosspickseoul.domainlayer.district.application.info.foottraffic;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import lombok.Builder;

@Builder
public record DistrictTimeSlotFootTrafficInfo(
    long footTrafficTime00To06,
    long footTrafficTime06To11,
    long footTrafficTime11To14,
    long footTrafficTime14To17,
    long footTrafficTime17To21,
    long footTrafficTime21To24,
    CodeNameDescriptionMetadata dominantTimeSlotType
) {

}
