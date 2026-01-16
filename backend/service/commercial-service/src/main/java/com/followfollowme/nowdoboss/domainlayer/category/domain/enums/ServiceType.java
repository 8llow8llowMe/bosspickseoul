package com.followfollowme.nowdoboss.domainlayer.category.domain.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ServiceType {

    RESTAURANT("음식점"),
    ACADEMY("교육"),
    LEISURE("레저/오락"),
    SERVICE("서비스"),
    RETAIL("도소매업"),
    HOUSEHOLDS("생활용품");

    private final String description;
}
