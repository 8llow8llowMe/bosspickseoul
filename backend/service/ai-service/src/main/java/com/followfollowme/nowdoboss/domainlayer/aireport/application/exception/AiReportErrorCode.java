package com.followfollowme.nowdoboss.domainlayer.aireport.application.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum AiReportErrorCode {

    SOURCE_DATA_UNAVAILABLE("AI_001", "AI 리포트 생성에 필요한 원천 데이터를 불러올 수 없습니다.", HttpStatus.BAD_GATEWAY),
    LLM_UNAVAILABLE("AI_002", "AI 리포트 생성 서비스를 일시적으로 사용할 수 없습니다.", HttpStatus.SERVICE_UNAVAILABLE),
    INVALID_LLM_RESPONSE("AI_003", "AI 리포트 결과를 해석하는 중 오류가 발생했습니다.", HttpStatus.BAD_GATEWAY),
    CACHE_UNAVAILABLE("AI_004", "AI 리포트 캐시를 사용할 수 없습니다.", HttpStatus.SERVICE_UNAVAILABLE),
    JOB_NOT_FOUND("AI_005", "요청하신 AI 리포트 작업을 찾을 수 없습니다.", HttpStatus.NOT_FOUND),
    JOB_STORE_UNAVAILABLE("AI_006", "AI 리포트 작업 저장소를 사용할 수 없습니다.", HttpStatus.SERVICE_UNAVAILABLE),
    JOB_FAILED("AI_008", "AI 리포트 작업이 실패했습니다.", HttpStatus.INTERNAL_SERVER_ERROR),
    JOB_TIMEOUT("AI_009", "AI 리포트 작업이 시간 내에 완료되지 않았습니다.", HttpStatus.GATEWAY_TIMEOUT),
    LLM_SCHEMA_UNSUPPORTED("AI_010", "지원하지 않는 LLM 응답 스키마 정의입니다. (%s)", HttpStatus.INTERNAL_SERVER_ERROR),
    IDEMPOTENCY_KEY_GENERATION_FAILED("AI_011", "AI 리포트 요청 식별자 생성에 실패했습니다.", HttpStatus.INTERNAL_SERVER_ERROR),

    // 요청 검증(Bean Validation) 전용 코드 — 1xx 대역.
    INVALID_REQUEST("AI_100", "요청 값이 올바르지 않습니다.", HttpStatus.BAD_REQUEST),
    PARAMETER_TYPE_INVALID("AI_101", "요청 파라미터 형식이 올바르지 않습니다.", HttpStatus.BAD_REQUEST);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
