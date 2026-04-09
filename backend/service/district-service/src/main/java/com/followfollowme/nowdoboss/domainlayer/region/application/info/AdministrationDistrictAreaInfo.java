package com.followfollowme.nowdoboss.domainlayer.region.application.info;

import com.followfollowme.nowdoboss.domainlayer.region.domain.model.AreaCommercial;
import lombok.Builder;

@Builder
public record AdministrationDistrictAreaInfo(
    String districtCode,
    String districtName,
    String administrationCode,
    String administrationName
) {

    public static AdministrationDistrictAreaInfo from(AreaCommercial areaCommercial) {
        return AdministrationDistrictAreaInfo.builder()
            .districtCode(areaCommercial.districtCode())
            .districtName(areaCommercial.districtName())
            .administrationCode(areaCommercial.administrationCode())
            .administrationName(areaCommercial.administrationName())
            .build();
    }
}
