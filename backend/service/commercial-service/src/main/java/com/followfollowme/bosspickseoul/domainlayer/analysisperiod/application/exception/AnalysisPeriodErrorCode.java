package com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum AnalysisPeriodErrorCode {

    // 분기를 생략한 요청에서 기본 분기를 정할 수 없을 때(콜드 스타트 DB 장애, 핵심 데이터셋 공통 분기 없음).
    // 분기를 명시한 요청은 이 오류를 받지 않는다.
    DEFAULT_PERIOD_UNAVAILABLE("ANALYSIS_PERIOD_001", "분석 기준 분기를 아직 정할 수 없습니다. 잠시 후 다시 시도해 주세요.",
        HttpStatus.SERVICE_UNAVAILABLE);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
