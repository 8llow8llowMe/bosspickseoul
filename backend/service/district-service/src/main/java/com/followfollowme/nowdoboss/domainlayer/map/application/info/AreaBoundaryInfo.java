package com.followfollowme.nowdoboss.domainlayer.map.application.info;

import com.followfollowme.nowdoboss.domainlayer.map.domain.model.AreaBoundary;
import java.util.List;
import lombok.Builder;

@Builder
public record AreaBoundaryInfo(
    String areaCode,
    String areaName,
    double centerLng,
    double centerLat,
    List<List<Double>> boundaryCoords
) {

    public static AreaBoundaryInfo from(AreaBoundary areaBoundary, List<List<Double>> boundaryCoords) {
        return AreaBoundaryInfo.builder()
            .areaCode(areaBoundary.areaCode())
            .areaName(areaBoundary.areaName())
            .centerLng(areaBoundary.centerLng())
            .centerLat(areaBoundary.centerLat())
            .boundaryCoords(boundaryCoords)
            .build();
    }
}
