package com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query;

public record ComparePreviewTargetQueryResult(
    String commercialCode,
    String commercialName,
    String districtCode,
    String districtName,
    String administrationCode,
    String administrationName
) {

}
