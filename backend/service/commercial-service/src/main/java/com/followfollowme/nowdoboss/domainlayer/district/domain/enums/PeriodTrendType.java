package com.followfollowme.nowdoboss.domainlayer.district.domain.enums;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescribable;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum PeriodTrendType implements CodeNameDescribable {
    INCREASE("증가"),
    DECREASE("감소"),
    STAGNANT("정체");

    private final String displayName;
}
