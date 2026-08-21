package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import lombok.Builder;

@JsonIgnoreProperties(ignoreUnknown = true)
@Builder
public record DistrictAgeGroupFootTrafficQueryResult(
    long age10FootTraffic,
    long age20FootTraffic,
    long age30FootTraffic,
    long age40FootTraffic,
    long age50FootTraffic,
    long age60PlusFootTraffic,
    CodeNameDescriptionMetadata dominantAgeGroupType
) {

}
