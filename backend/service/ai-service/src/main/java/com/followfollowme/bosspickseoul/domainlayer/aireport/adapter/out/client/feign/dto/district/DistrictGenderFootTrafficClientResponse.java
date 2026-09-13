package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.district;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;

@JsonIgnoreProperties(ignoreUnknown = true)
public record DistrictGenderFootTrafficClientResponse(
    long maleFootTraffic,
    long femaleFootTraffic,
    CodeNameDescriptionMetadata dominantGenderType
) {

}
