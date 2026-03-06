package com.followfollowme.nowdoboss.domainlayer.region.application.info;

import com.followfollowme.nowdoboss.domainlayer.region.domain.model.AreaCommercial;
import lombok.Builder;

@Builder
public record CommercialAdministrationAreaInfo(
    String districtCode,
    String districtCodeName,
    String administrationCode,
    String administrationCodeName
) {

    public static CommercialAdministrationAreaInfo from(AreaCommercial areaCommercial) {
        return CommercialAdministrationAreaInfo.builder()
            .districtCode(areaCommercial.districtCode())
            .districtCodeName(areaCommercial.districtCodeName())
            .administrationCode(areaCommercial.administrationCode())
            .administrationCodeName(areaCommercial.administrationCodeName())
            .build();
    }
}
