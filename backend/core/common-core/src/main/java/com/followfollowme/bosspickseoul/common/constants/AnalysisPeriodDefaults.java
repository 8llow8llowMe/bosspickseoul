package com.followfollowme.bosspickseoul.common.constants;

/**
 * 상권분석 API의 기본 분기 코드 단일 출처.
 *
 * <p>환경별 설정이 아니라 공개 API 계약값이다. 분기 적재가 끝나 최신 분기가 바뀌면 이 상수만
 * 갱신한다. {@code @RequestParam(defaultValue = ...)} 와 Swagger {@code example} 양쪽에서 같이 쓴다.
 */
public final class AnalysisPeriodDefaults {

    /** 개발 DB 분기 적재 기준 최신 분기(2026년 1분기). */
    public static final String PERIOD_CODE = "20261";

    private AnalysisPeriodDefaults() {
    }
}
