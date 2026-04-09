package com.followfollowme.nowdoboss.domainlayer.commercial.application.port.out.query;

public record CommercialAdministrationQueryResult(
    String districtCode,
    String districtName,
    String administrationCode,
    String administrationName
) {

}
