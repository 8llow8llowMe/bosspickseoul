package com.followfollowme.bosspickseoul.domainlayer.region.application.info;

import com.followfollowme.bosspickseoul.domainlayer.region.domain.model.CommercialRegionMapping;
import lombok.Builder;

@Builder
public record CommercialAdministrationAreaInfo(
    String commercialCode,
    String commercialName,
    String districtCode,
    String districtName,
    String administrationCode,
    String administrationName
) {

    public static CommercialAdministrationAreaInfo from(CommercialRegionMapping commercialRegionMapping) {
        return CommercialAdministrationAreaInfo.builder()
            .commercialCode(commercialRegionMapping.commercialCode())
            .commercialName(commercialRegionMapping.commercialName())
            .districtCode(commercialRegionMapping.districtCode())
            .districtName(commercialRegionMapping.districtName())
            .administrationCode(commercialRegionMapping.administrationCode())
            .administrationName(commercialRegionMapping.administrationName())
            .build();
    }
}
