package com.followfollowme.nowdoboss.domainlayer.map.domain.model;

import com.followfollowme.nowdoboss.domainlayer.map.domain.enums.AreaType;
import lombok.Builder;

@Builder
public record AreaBoundary(
    long id,
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
