package com.followfollowme.nowdoboss.domainlayer.commercial.application.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum CommercialErrorCode {

    COMMERCIAL_NOT_FOUND("COMMERCIAL_002", "존재하지 않는 상권입니다.", HttpStatus.NOT_FOUND),
    SERVICE_CODE_REQUIRED("COMMERCIAL_003", "서비스 업종 코드는 필수입니다.", HttpStatus.BAD_REQUEST),
    PERIOD_CODE_INVALID("COMMERCIAL_004", "기준 분기 코드 형식이 올바르지 않습니다.", HttpStatus.BAD_REQUEST),
    COMPARISON_SAME_COMMERCIAL("COMMERCIAL_005", "비교 대상 상권이 서로 같을 수 없습니다.", HttpStatus.BAD_REQUEST),
    FOOT_TRAFFIC_NOT_FOUND("COMMERCIAL_006", "유동 인구 정보를 찾을 수 없습니다.", HttpStatus.NOT_FOUND),
    SALES_NOT_FOUND("COMMERCIAL_007", "매출 정보를 찾을 수 없습니다.", HttpStatus.NOT_FOUND),
    FACILITY_NOT_FOUND("COMMERCIAL_008", "집객시설 정보를 찾을 수 없습니다.", HttpStatus.NOT_FOUND),
    RESIDENT_POPULATION_NOT_FOUND("COMMERCIAL_009", "상주인구 정보를 찾을 수 없습니다.", HttpStatus.NOT_FOUND),
    INCOME_NOT_FOUND("COMMERCIAL_010", "소득소비 정보를 찾을 수 없습니다.", HttpStatus.NOT_FOUND),
    STORE_NOT_FOUND("COMMERCIAL_011", "점포 정보를 찾을 수 없습니다.", HttpStatus.NOT_FOUND),

    // 요청 검증(Bean Validation) 대역 — 1xx.
    // 필드별 코드(COMMERCIAL_101)는 CommercialValidationMessage 가 단일 기준점이며, 여기서는 중복 정의하지 않는다.
    INVALID_REQUEST("COMMERCIAL_100", "요청 값이 올바르지 않습니다.", HttpStatus.BAD_REQUEST),
    PARAMETER_TYPE_INVALID("COMMERCIAL_102", "요청 파라미터 형식이 올바르지 않습니다.", HttpStatus.BAD_REQUEST);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
