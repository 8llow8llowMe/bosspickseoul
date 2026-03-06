package com.followfollowme.nowdoboss.domainlayer.areaboundary.domain.model;

import com.followfollowme.nowdoboss.domainlayer.areaboundary.domain.enums.AreaType;
import lombok.Builder;

@Builder
public record AreaBoundary(
    AreaType areaType,
    String areaCode,
    String areaName,
    double centerLng,
    double centerLat,
    String boundaryGeoJson,
    double bboxMinLng,
    double bboxMinLat,
    double bboxMaxLng,
    double bboxMaxLat
) {

}
