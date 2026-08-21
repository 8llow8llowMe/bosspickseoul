package com.followfollowme.bosspickseoul.domainlayer.ranking.domain.enums;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescribable;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 인기 순위 집계 대상 분석 영역 타입.
 *
 * <p>RequestParam 은 enum 으로 직접 바인딩한다 (api-design-guide §5 — Swagger 허용값 자동 노출).
 * 잘못된 값은 MethodArgumentTypeMismatchException 으로 서비스 공통 COMMERCIAL_102 가 응답한다.
 */
@Getter
@RequiredArgsConstructor
public enum AnalysisAreaType implements CodeNameDescribable {

    COMMERCIAL("상권", "상권 상세 분석"),
    DISTRICT("자치구", "자치구 분석"),
    ADMINISTRATION("행정동", "행정동 분석");

    private final String displayName;
    private final String description;
}
