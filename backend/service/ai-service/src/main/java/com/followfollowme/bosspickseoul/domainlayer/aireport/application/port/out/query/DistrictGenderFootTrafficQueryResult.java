package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import lombok.Builder;

@Builder
public record DistrictGenderFootTrafficQueryResult(
    long maleFootTraffic,
    long femaleFootTraffic,
    CodeNameDescriptionMetadata dominantGenderType
) {

}
