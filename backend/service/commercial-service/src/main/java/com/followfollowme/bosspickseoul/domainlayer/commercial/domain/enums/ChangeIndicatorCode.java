package com.followfollowme.bosspickseoul.domainlayer.commercial.domain.enums;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescribable;
import java.util.Arrays;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 서울시 상권 변화 지표 4분류 (운영 영업기간 x 폐업 영업기간).
 * 첫 글자 = 운영 기간 (H/L), 두 번째 글자 = 폐업 기간 (H/L).
 */
@Getter
@RequiredArgsConstructor
public enum ChangeIndicatorCode implements CodeNameDescribable {
    HH("정체 상권", "운영·폐업 기간 모두 서울 평균 이상 — 포화된 시장으로 진입에 주의가 필요합니다."),
    HL("안정 상권", "운영 기간은 길고 폐업 기간은 짧음 — 기존 업체가 경쟁 우위를 갖는 시장입니다."),
    LH("발달 상권", "운영 기간은 짧지만 폐업 기간은 길어 — 신규 진입 업체가 경쟁력을 갖기 좋은 시장입니다."),
    LL("다이나믹 상권", "운영·폐업 기간 모두 짧음 — 변화가 큰 시장으로 신규 진입 시 주의가 필요합니다.");

    private final String displayName;
    private final String description;

    public static ChangeIndicatorCode fromCode(String code) {
        if (code == null) {
            return null;
        }
        return Arrays.stream(values())
            .filter(value -> value.name().equals(code))
            .findFirst()
            .orElse(null);
    }
}
