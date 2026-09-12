package com.followfollowme.bosspickseoul.domainlayer.region.application.info;

import com.followfollowme.bosspickseoul.domainlayer.region.domain.model.Wgs84Coordinate;
import lombok.Builder;

@Builder
public record AdministrationAreaInfo(
    String administrationCode,
    String administrationName,
    double centerLat,
    double centerLng
) {

    public static AdministrationAreaInfo from(String administrationCode, String administrationName, Wgs84Coordinate center) {
        return AdministrationAreaInfo.builder()
            .administrationCode(administrationCode)
            .administrationName(administrationName)
            .centerLat(center.lat())
            .centerLng(center.lng())
            .build();
    }
}
