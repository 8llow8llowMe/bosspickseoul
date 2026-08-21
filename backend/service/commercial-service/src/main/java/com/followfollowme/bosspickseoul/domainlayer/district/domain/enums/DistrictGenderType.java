package com.followfollowme.bosspickseoul.domainlayer.district.domain.enums;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescribable;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum DistrictGenderType implements CodeNameDescribable {
    MALE("남성"),
    FEMALE("여성");

    private final String displayName;
}
