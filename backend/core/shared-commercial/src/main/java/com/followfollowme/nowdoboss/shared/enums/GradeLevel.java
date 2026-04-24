package com.followfollowme.nowdoboss.shared.enums;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescribable;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 상권 점수 등급 — 히트맵·후보 랭킹 전역에서 사용한다.
 * 70 이상 HIGH / 40 이상 MEDIUM / 그 외 LOW / 데이터 부족 시 INSUFFICIENT.
 */
@Getter
@RequiredArgsConstructor
public enum GradeLevel implements CodeNameDescribable {
    HIGH("상", "정규화 점수 70 이상 구간입니다."),
    MEDIUM("중", "정규화 점수 40 이상 70 미만 구간입니다."),
    LOW("하", "정규화 점수 40 미만 구간입니다."),
    INSUFFICIENT("데이터 부족", "점수 산정에 필요한 원천 데이터가 부족합니다.");

    public static final double HIGH_THRESHOLD = 70D;
    public static final double MEDIUM_THRESHOLD = 40D;

    private final String displayName;
    private final String description;

    public static GradeLevel fromScore(Double score) {
        if (score == null) {
            return INSUFFICIENT;
        }
        if (score >= HIGH_THRESHOLD) {
            return HIGH;
        }
        if (score >= MEDIUM_THRESHOLD) {
            return MEDIUM;
        }
        return LOW;
    }
}
