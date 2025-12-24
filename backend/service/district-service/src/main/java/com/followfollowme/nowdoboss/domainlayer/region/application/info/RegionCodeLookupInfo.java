package com.followfollowme.nowdoboss.domainlayer.region.application.info;

import com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.projection.AdministrationCodeProjection;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.projection.CommercialCodeProjection;
import com.followfollowme.nowdoboss.domainlayer.region.adapter.out.persistence.projection.DistrictCodeProjection;
import lombok.Builder;

@Builder
public record RegionCodeLookupInfo(
    String districtCode,
    String districtCodeName,
    String administrationCode,
    String administrationCodeName,
    String commercialCode,
    String commercialCodeName
) {

    public static RegionCodeLookupInfo from(DistrictCodeProjection projection) {
        return RegionCodeLookupInfo.builder()
            .districtCode(projection.getDistrictCode())
            .districtCodeName(projection.getDistrictCodeName())
            .build();
    }

    public static RegionCodeLookupInfo from(AdministrationCodeProjection projection) {
        return RegionCodeLookupInfo.builder()
            .districtCode(projection.getDistrictCode())
            .districtCodeName(projection.getDistrictCodeName())
            .administrationCode(projection.getAdministrationCode())
            .administrationCodeName(projection.getAdministrationCodeName())
            .build();
    }

    public static RegionCodeLookupInfo from(CommercialCodeProjection projection) {
        return RegionCodeLookupInfo.builder()
            .districtCode(projection.getDistrictCode())
            .districtCodeName(projection.getDistrictCodeName())
            .administrationCode(projection.getAdministrationCode())
            .administrationCodeName(projection.getAdministrationCodeName())
            .commercialCode(projection.getCommercialCode())
            .commercialCodeName(projection.getCommercialCodeName())
            .build();
    }
}
