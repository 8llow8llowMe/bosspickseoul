package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescriptionMetadata;
import lombok.Builder;

@JsonIgnoreProperties(ignoreUnknown = true)
@Builder
public record DistrictGenderFootTrafficQueryResult(
    long maleFootTraffic,
    long femaleFootTraffic,
    CodeNameDescriptionMetadata dominantGenderType
) {

}
