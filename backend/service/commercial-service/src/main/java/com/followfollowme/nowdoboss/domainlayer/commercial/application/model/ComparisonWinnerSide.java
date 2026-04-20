package com.followfollowme.nowdoboss.domainlayer.commercial.application.model;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescribable;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ComparisonWinnerSide implements CodeNameDescribable {
    LEFT("좌측 상권 우세"),
    RIGHT("우측 상권 우세"),
    TIE("동률");

    private final String displayName;
}
