package com.followfollowme.nowdoboss.domainlayer.district.domain.enums;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescribable;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum FootTrafficTimeSlotType implements CodeNameDescribable {
    TIME_00_TO_06("00~06시"),
    TIME_06_TO_11("06~11시"),
    TIME_11_TO_14("11~14시"),
    TIME_14_TO_17("14~17시"),
    TIME_17_TO_21("17~21시"),
    TIME_21_TO_24("21~24시");

    private final String displayName;
}
