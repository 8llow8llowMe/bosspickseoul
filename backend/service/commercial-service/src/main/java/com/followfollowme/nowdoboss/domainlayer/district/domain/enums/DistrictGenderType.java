package com.followfollowme.nowdoboss.domainlayer.district.domain.enums;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescribable;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum DistrictGenderType implements CodeNameDescribable {
    MALE("남성"),
    FEMALE("여성");

    private final String displayName;
}
