package com.followfollowme.nowdoboss.common.enums;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescribable;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum OrderType implements CodeNameDescribable {
    ASC("오름차순"),
    DESC("내림차순");

    private final String displayName;
}
