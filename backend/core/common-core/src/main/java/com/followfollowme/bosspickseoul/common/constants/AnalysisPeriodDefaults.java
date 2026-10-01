package com.followfollowme.bosspickseoul.common.constants;

/**
 * 분석 API 분기 파라미터의 <b>Swagger 예시·설명 전용</b> 상수. <b>기본값이 아니다.</b>
 *
 * <p>기본 분기는 적재된 데이터로 정한다(이슈 #464). {@code periodCode} 를 생략하면 commercial-service 의
 * {@code AnalysisPeriodCatalogProcessor} 가 적재된 팩트 테이블 기준 최신 공통 분기로 해석하고, 그 값은
 * {@code GET /api/v1/commercials/periods} 의 {@code defaultPeriodCode} 로 공개된다. 이 상수를
 * {@code @RequestParam(defaultValue = ...)} 나 런타임 폴백에 쓰면 적재되지 않은 분기를 기본으로 내보내 화면이
 * 「데이터 없음」이 되므로 쓰지 않는다. 분기가 적재돼도 이 상수를 갱신할 필요는 없다.
 */
public final class AnalysisPeriodDefaults {

    /** Swagger {@code example} 에만 쓰는 분기 코드(2026년 1분기). */
    public static final String PERIOD_CODE = "20261";

    /** 분기를 선택 파라미터로 받는 API 의 Swagger 설명. 생략 규칙을 서비스마다 다르게 적지 않도록 한 곳에 둔다. */
    public static final String PERIOD_CODE_DESCRIPTION =
        "기준 분기 코드(YYYYQ). 미지정·빈 값이면 적재된 최신 공통 분기(GET /api/v1/commercials/periods 의 defaultPeriodCode)";

    private AnalysisPeriodDefaults() {
    }
}
