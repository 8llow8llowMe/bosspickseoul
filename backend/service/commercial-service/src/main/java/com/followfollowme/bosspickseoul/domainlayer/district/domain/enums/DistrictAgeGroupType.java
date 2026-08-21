package com.followfollowme.bosspickseoul.domainlayer.district.domain.enums;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescribable;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum DistrictAgeGroupType implements CodeNameDescribable {
    AGE_10("10대"),
    AGE_20("20대"),
    AGE_30("30대"),
    AGE_40("40대"),
    AGE_50("50대"),
    AGE_60_PLUS("60대 이상");

    private final String displayName;
}
