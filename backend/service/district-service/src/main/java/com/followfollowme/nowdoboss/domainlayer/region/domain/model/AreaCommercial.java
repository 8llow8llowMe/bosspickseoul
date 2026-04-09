package com.followfollowme.nowdoboss.domainlayer.region.domain.model;

import lombok.Builder;

@Builder
public record AreaCommercial(
    long id,
    String commercialClassificationCode,
    String commercialClassificationName,
    String commercialCode,
    String commercialName,
    double x,
    double y,
    String districtCode,
    String districtName,
    String administrationCode,
    String administrationName
) {

}
