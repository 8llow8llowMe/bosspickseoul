package com.followfollowme.nowdoboss.domainlayer.region.application.info;

import com.followfollowme.nowdoboss.domainlayer.region.domain.model.CommercialRegionMapping;
import lombok.Builder;
import org.locationtech.jts.geom.Point;

@Builder
public record CommercialAreaInfo(
    String commercialCode,
    String commercialName,
    String commercialClassificationCode,
    String commercialClassificationName,
    double centerLat,
    double centerLng
) {

    public static CommercialAreaInfo from(CommercialRegionMapping area, Point center) {
        return CommercialAreaInfo.builder()
            .commercialCode(area.commercialCode())
            .commercialName(area.commercialName())
            .commercialClassificationCode(area.commercialClassificationCode())
            .commercialClassificationName(area.commercialClassificationName())
            .centerLat(center.getX())
            .centerLng(center.getY())
            .build();
    }
}
