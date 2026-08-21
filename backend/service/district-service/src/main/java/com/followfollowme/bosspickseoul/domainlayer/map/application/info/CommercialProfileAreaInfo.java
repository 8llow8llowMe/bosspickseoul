package com.followfollowme.bosspickseoul.domainlayer.map.application.info;

import java.util.List;
import lombok.Builder;

@Builder
public record CommercialProfileAreaInfo(
    String commercialCode,
    String commercialName,
    String districtCode,
    String districtName,
    String administrationCode,
    String administrationName,
    Double centerLng,
    Double centerLat,
    List<List<Double>> boundaryCoords,
    CommercialProfileKeyMetricsInfo keyMetrics
) {

}
