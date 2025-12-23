package com.followfollowme.nowdoboss.domainlayer.region.application.info;

import com.followfollowme.nowdoboss.domainlayer.region.domain.model.AreaCommercial;
import lombok.Builder;
import org.locationtech.jts.geom.Point;

@Builder
public record CommercialAreaInfo(
    String commercialCode,
    String commercialCodeName,
    String commercialClassificationCode,
    String commercialClassificationCodeName,
    double centerLat,
    double centerLng
) {

    public static CommercialAreaInfo from(AreaCommercial area, Point center) {
        return CommercialAreaInfo.builder()
            .commercialCode(area.commercialCode())
            .commercialCodeName(area.commercialCodeName())
            .commercialClassificationCode(area.commercialClassificationCode())
            .commercialClassificationCodeName(area.commercialClassificationCodeName())
            .centerLat(center.getX())
            .centerLng(center.getY())
            .build();
    }
}
