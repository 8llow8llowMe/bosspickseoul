package com.followfollowme.nowdoboss.domainlayer.region.application.info;

import com.followfollowme.nowdoboss.domainlayer.region.domain.model.CommercialRegionMapping;
import lombok.Builder;

@Builder
public record CommercialAdministrationAreaInfo(
    String districtCode,
    String districtName,
    String administrationCode,
    String administrationName
) {

    public static CommercialAdministrationAreaInfo from(CommercialRegionMapping commercialRegionMapping) {
        return CommercialAdministrationAreaInfo.builder()
            .districtCode(commercialRegionMapping.districtCode())
            .districtName(commercialRegionMapping.districtName())
            .administrationCode(commercialRegionMapping.administrationCode())
            .administrationName(commercialRegionMapping.administrationName())
            .build();
    }
}
