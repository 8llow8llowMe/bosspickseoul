package com.followfollowme.bosspickseoul.domainlayer.region.application.info;

import com.followfollowme.bosspickseoul.domainlayer.region.domain.model.CommercialRegionMapping;
import lombok.Builder;

@Builder
public record AdministrationDistrictAreaInfo(
    String districtCode,
    String districtName,
    String administrationCode,
    String administrationName
) {

    public static AdministrationDistrictAreaInfo from(CommercialRegionMapping commercialRegionMapping) {
        return AdministrationDistrictAreaInfo.builder()
            .districtCode(commercialRegionMapping.districtCode())
            .districtName(commercialRegionMapping.districtName())
            .administrationCode(commercialRegionMapping.administrationCode())
            .administrationName(commercialRegionMapping.administrationName())
            .build();
    }
}
