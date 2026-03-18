package com.followfollowme.nowdoboss.persistence.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum OrderType {
    ASC("오름차순"),
    DESC("내림차순");

    private final String description;
}
