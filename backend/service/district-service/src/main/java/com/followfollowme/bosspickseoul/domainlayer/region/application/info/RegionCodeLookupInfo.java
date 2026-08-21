package com.followfollowme.bosspickseoul.domainlayer.region.application.info;

import com.followfollowme.bosspickseoul.domainlayer.region.adapter.out.persistence.projection.AdministrationNameProjection;
import com.followfollowme.bosspickseoul.domainlayer.region.adapter.out.persistence.projection.CommercialNameProjection;
import com.followfollowme.bosspickseoul.domainlayer.region.adapter.out.persistence.projection.DistrictNameProjection;
import lombok.Builder;

@Builder
public record RegionCodeLookupInfo(
    String districtCode,
    String districtName,
    String administrationCode,
    String administrationName,
    String commercialCode,
    String commercialName
) {

    public static RegionCodeLookupInfo from(DistrictNameProjection projection) {
        return RegionCodeLookupInfo.builder()
            .districtCode(projection.getDistrictCode())
            .districtName(projection.getDistrictName())
            .build();
    }

    public static RegionCodeLookupInfo from(AdministrationNameProjection projection) {
        return RegionCodeLookupInfo.builder()
            .districtCode(projection.getDistrictCode())
            .districtName(projection.getDistrictName())
            .administrationCode(projection.getAdministrationCode())
            .administrationName(projection.getAdministrationName())
            .build();
    }

    public static RegionCodeLookupInfo from(CommercialNameProjection projection) {
        return RegionCodeLookupInfo.builder()
            .districtCode(projection.getDistrictCode())
            .districtName(projection.getDistrictName())
            .administrationCode(projection.getAdministrationCode())
            .administrationName(projection.getAdministrationName())
            .commercialCode(projection.getCommercialCode())
            .commercialName(projection.getCommercialName())
            .build();
    }
}
