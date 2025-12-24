package com.followfollowme.nowdoboss.domainlayer.region.domain.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum RegionCodeType {

    DISTRICT("자치구"),
    ADMINISTRATION("행정동"),
    COMMERCIAL("상권");

    private final String description;
}

