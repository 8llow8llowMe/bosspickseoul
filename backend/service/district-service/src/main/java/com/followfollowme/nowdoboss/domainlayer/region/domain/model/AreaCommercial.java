package com.followfollowme.nowdoboss.domainlayer.region.domain.model;

import lombok.Builder;

@Builder
public record AreaCommercial(
    long id,
    String commercialClassificationCode,
    String commercialClassificationCodeName,
    String commercialCode,
    String commercialCodeName,
    double x,
    double y,
    String districtCode,
    String districtCodeName,
    String administrationCode,
    String administrationCodeName
) {

}
