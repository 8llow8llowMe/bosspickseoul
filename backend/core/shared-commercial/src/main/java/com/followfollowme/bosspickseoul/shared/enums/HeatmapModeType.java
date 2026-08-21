package com.followfollowme.bosspickseoul.shared.enums;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescribable;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum HeatmapModeType implements CodeNameDescribable {
    SINGLE_METRIC(
        "단일 지표 히트맵",
        "하나의 점수 지표 기준으로 상권 영역을 표시하는 히트맵입니다."
    ),
    COMPOSITE(
        "복합 추천 히트맵",
        "프리셋과 우선 지표를 조합해 추천 후보를 계산한 히트맵입니다."
    );

    private final String displayName;
    private final String description;
}
