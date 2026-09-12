package com.followfollowme.bosspickseoul.domainlayer.region.application.info;

import com.followfollowme.bosspickseoul.domainlayer.region.domain.model.CommercialRegionMapping;
import com.followfollowme.bosspickseoul.domainlayer.region.domain.model.Wgs84Coordinate;
import lombok.Builder;

@Builder
public record CommercialAreaInfo(
    String commercialCode,
    String commercialName,
    String commercialClassificationCode,
    String commercialClassificationName,
    double centerLat,
    double centerLng
) {

    public static CommercialAreaInfo from(CommercialRegionMapping area, Wgs84Coordinate center) {
        return CommercialAreaInfo.builder()
            .commercialCode(area.commercialCode())
            .commercialName(area.commercialName())
            .commercialClassificationCode(area.commercialClassificationCode())
            .commercialClassificationName(area.commercialClassificationName())
            .centerLat(center.lat())
            .centerLng(center.lng())
            .build();
    }
}
