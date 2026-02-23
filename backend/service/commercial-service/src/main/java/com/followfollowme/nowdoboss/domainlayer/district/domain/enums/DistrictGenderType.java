package com.followfollowme.nowdoboss.domainlayer.district.domain.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum DistrictGenderType {
    MALE("남성"),
    FEMALE("여성");

    private final String description;
}
