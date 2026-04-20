package com.followfollowme.nowdoboss.domainlayer.district.application.info.foottraffic;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescriptionMetadata;
import lombok.Builder;

@Builder
public record DistrictGenderFootTrafficInfo(
    long maleFootTraffic,
    long femaleFootTraffic,
    CodeNameDescriptionMetadata dominantGenderType
) {

}
