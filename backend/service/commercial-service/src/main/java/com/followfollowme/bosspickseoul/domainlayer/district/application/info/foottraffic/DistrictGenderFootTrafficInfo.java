package com.followfollowme.bosspickseoul.domainlayer.district.application.info.foottraffic;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import lombok.Builder;

@Builder
public record DistrictGenderFootTrafficInfo(
    long maleFootTraffic,
    long femaleFootTraffic,
    CodeNameDescriptionMetadata dominantGenderType
) {

}
