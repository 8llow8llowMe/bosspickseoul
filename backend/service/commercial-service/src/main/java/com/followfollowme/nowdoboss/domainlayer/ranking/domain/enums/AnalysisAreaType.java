package com.followfollowme.nowdoboss.domainlayer.ranking.domain.enums;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescribable;
import com.followfollowme.nowdoboss.domainlayer.ranking.application.exception.RankingErrorCode;
import com.followfollowme.nowdoboss.domainlayer.ranking.application.exception.RankingException;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 인기 순위 집계 대상 분석 영역 타입.
 */
@Getter
@RequiredArgsConstructor
public enum AnalysisAreaType implements CodeNameDescribable {

    COMMERCIAL("상권", "상권 상세 분석"),
    DISTRICT("자치구", "자치구 분석"),
    ADMINISTRATION("행정동", "행정동 분석");

    private final String displayName;
    private final String description;

    public static AnalysisAreaType from(String value) {
        try {
            return AnalysisAreaType.valueOf(value.toUpperCase());
        } catch (RuntimeException exception) {
            throw new RankingException(RankingErrorCode.INVALID_AREA_TYPE);
        }
    }
}
