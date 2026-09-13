package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import lombok.Builder;

@Builder
public record AdministrationDistrictQueryResult(
    String districtCode,
    String districtName,
    String administrationCode,
    String administrationName
) {

}
