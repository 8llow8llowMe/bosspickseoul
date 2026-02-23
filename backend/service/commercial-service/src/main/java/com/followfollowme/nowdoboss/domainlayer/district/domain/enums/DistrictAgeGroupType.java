package com.followfollowme.nowdoboss.domainlayer.district.domain.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum DistrictAgeGroupType {
    AGE_10("10대"),
    AGE_20("20대"),
    AGE_30("30대"),
    AGE_40("40대"),
    AGE_50("50대"),
    AGE_60_PLUS("60대 이상");

    private final String description;
}
