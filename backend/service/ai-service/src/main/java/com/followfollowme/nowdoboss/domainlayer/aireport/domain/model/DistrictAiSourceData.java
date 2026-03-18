package com.followfollowme.nowdoboss.domainlayer.aireport.domain.model;

import com.fasterxml.jackson.databind.JsonNode;

public record DistrictAiSourceData(
    String districtCode,
    String periodCode,
    JsonNode districtDetail
) {

}
