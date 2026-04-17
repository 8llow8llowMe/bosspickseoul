package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query;

public record CommercialComparisonTargetQueryResult(
    String commercialCode,
    String commercialName,
    String districtCode,
    String districtName,
    String administrationCode,
    String administrationName
) {

}
