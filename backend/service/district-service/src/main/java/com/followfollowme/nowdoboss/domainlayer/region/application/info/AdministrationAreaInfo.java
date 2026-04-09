package com.followfollowme.nowdoboss.domainlayer.region.application.info;

import lombok.Builder;
import org.locationtech.jts.geom.Point;

@Builder
public record AdministrationAreaInfo(
    String administrationCode,
    String administrationName,
    double centerLat,
    double centerLng
) {

    public static AdministrationAreaInfo from(String administrationCode, String administrationName, Point center) {
        return AdministrationAreaInfo.builder()
            .administrationCode(administrationCode)
            .administrationName(administrationName)
            .centerLat(center.getX())
            .centerLng(center.getY())
            .build();
    }
}
