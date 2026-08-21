package com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.profile;

import lombok.Builder;

@Builder
public record CommercialProfileInfo(
    String periodCode,
    String serviceCode,
    String commercialCode,
    String commercialName,
    String districtCode,
    String districtName,
    String administrationCode,
    String administrationName,
    CommercialProfileKeyMetricsInfo keyMetrics
) {

}
