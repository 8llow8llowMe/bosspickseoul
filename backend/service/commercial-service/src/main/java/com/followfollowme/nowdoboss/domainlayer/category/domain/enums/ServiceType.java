package com.followfollowme.nowdoboss.domainlayer.category.domain.enums;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescribable;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ServiceType implements CodeNameDescribable {

    RESTAURANT("외식업"),
    ACADEMY("교육"),
    LEISURE("여가/오락"),
    SERVICE("서비스"),
    RETAIL("소매업"),
    HOUSEHOLDS("생활용품");

    private final String displayName;
}
