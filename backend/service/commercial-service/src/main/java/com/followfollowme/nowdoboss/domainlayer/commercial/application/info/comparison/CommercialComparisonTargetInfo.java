package com.followfollowme.nowdoboss.domainlayer.commercial.application.info.comparison;

import lombok.Builder;

@Builder
public record CommercialComparisonTargetInfo(
    String commercialCode,
    String commercialName,
    String districtCode,
    String districtName,
    String administrationCode,
    String administrationName
) {

}
