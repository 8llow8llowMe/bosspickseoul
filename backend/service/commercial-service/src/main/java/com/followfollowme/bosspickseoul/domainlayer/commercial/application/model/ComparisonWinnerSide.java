package com.followfollowme.bosspickseoul.domainlayer.commercial.application.model;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescribable;
import java.util.Arrays;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ComparisonWinnerSide implements CodeNameDescribable {
    LEFT("좌측 상권 우세"),
    RIGHT("우측 상권 우세"),
    TIE("동률");

    private final String displayName;

    public static ComparisonWinnerSide fromCode(String code) {
        if (code == null) {
            return TIE;
        }
        return Arrays.stream(values())
            .filter(side -> side.name().equals(code))
            .findFirst()
            .orElse(TIE);
    }
}
