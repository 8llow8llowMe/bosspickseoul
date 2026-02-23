package com.followfollowme.nowdoboss.domainlayer.district.domain.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum PeriodTrendType {
    INCREASE("증가"),
    DECREASE("감소"),
    STAGNANT("정체");

    private final String description;
}
