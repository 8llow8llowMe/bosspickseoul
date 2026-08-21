package com.followfollowme.bosspickseoul.domainlayer.commercial.application.port.out.query;

public record CommercialAdministrationQueryResult(
    String districtCode,
    String districtName,
    String administrationCode,
    String administrationName
) {

}
