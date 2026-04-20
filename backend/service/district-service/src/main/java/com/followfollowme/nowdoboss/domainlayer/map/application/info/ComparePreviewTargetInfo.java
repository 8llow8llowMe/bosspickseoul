package com.followfollowme.nowdoboss.domainlayer.map.application.info;

import lombok.Builder;

@Builder
public record ComparePreviewTargetInfo(
    String commercialCode,
    String commercialName,
    String districtCode,
    String districtName,
    String administrationCode,
    String administrationName
) {

}
