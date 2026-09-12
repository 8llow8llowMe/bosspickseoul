package com.followfollowme.bosspickseoul.domainlayer.region.application.info;

import com.followfollowme.bosspickseoul.domainlayer.region.application.port.out.query.RegionCodeLookupQueryResult;
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

    public static RegionCodeLookupInfo from(RegionCodeLookupQueryResult result) {
        return RegionCodeLookupInfo.builder()
            .districtCode(result.districtCode())
            .districtName(result.districtName())
            .administrationCode(result.administrationCode())
            .administrationName(result.administrationName())
            .commercialCode(result.commercialCode())
            .commercialName(result.commercialName())
            .build();
    }
}
