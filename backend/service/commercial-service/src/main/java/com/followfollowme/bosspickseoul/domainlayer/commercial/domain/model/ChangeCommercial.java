package com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model;

import lombok.Builder;

@Builder
public record ChangeCommercial(
    long id,
    String periodCode,
    String commercialClassificationCode,
    String commercialClassificationName,
    String commercialCode,
    String commercialName,
    String changeIndicatorCode,
    String changeIndicatorName,
    Integer averageOpenedMonths,
    Integer averageClosedMonths
) {

}
