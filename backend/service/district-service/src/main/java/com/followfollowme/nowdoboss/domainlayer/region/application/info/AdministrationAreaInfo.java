package com.followfollowme.nowdoboss.domainlayer.region.application.info;

import lombok.Builder;
import org.locationtech.jts.geom.Point;

@Builder
public record AdministrationAreaInfo(
    String administrationCode,
    String administrationCodeName,
    double centerLat,
    double centerLng
) {

    public static AdministrationAreaInfo from(String administrationCode, String administrationCodeName, Point center) {
        return AdministrationAreaInfo.builder()
            .administrationCode(administrationCode)
            .administrationCodeName(administrationCodeName)
            .centerLat(center.getX())
            .centerLng(center.getY())
            .build();
    }
}