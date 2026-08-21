package com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception;

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
    // 분기 종속 데이터 부재는 "일시 오류"가 아니라 "해당 분기 데이터 없음"으로 안내한다 (사용자가 분기를 바꾸도록 유도).
    FOOT_TRAFFIC_NOT_FOUND("COMMERCIAL_006", "해당 분기의 유동인구 데이터가 없습니다. 다른 분기를 선택해 주세요.", HttpStatus.NOT_FOUND),
    SALES_NOT_FOUND("COMMERCIAL_007", "해당 분기의 매출 데이터가 없습니다. 다른 분기를 선택해 주세요.", HttpStatus.NOT_FOUND),
    FACILITY_NOT_FOUND("COMMERCIAL_008", "해당 분기의 집객시설 데이터가 없습니다. 다른 분기를 선택해 주세요.", HttpStatus.NOT_FOUND),
    RESIDENT_POPULATION_NOT_FOUND("COMMERCIAL_009", "해당 분기의 상주인구 데이터가 없습니다. 다른 분기를 선택해 주세요.", HttpStatus.NOT_FOUND),
    INCOME_NOT_FOUND("COMMERCIAL_010", "해당 분기의 소득소비 데이터가 없습니다. 다른 분기를 선택해 주세요.", HttpStatus.NOT_FOUND),
    STORE_NOT_FOUND("COMMERCIAL_011", "해당 분기의 점포 데이터가 없습니다. 다른 분기를 선택해 주세요.", HttpStatus.NOT_FOUND),
    INTERNAL_SERVICE_UNAVAILABLE("COMMERCIAL_012", "지역 정보 서비스와의 통신이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.", HttpStatus.SERVICE_UNAVAILABLE),

    // 요청 검증(Bean Validation) 대역 — 1xx.
    // 필드별 코드(COMMERCIAL_101)는 CommercialValidationMessage 가 단일 기준점이며, 여기서는 중복 정의하지 않는다.
    INVALID_REQUEST("COMMERCIAL_100", "요청 값이 올바르지 않습니다.", HttpStatus.BAD_REQUEST),
    PARAMETER_TYPE_INVALID("COMMERCIAL_102", "요청 파라미터 형식이 올바르지 않습니다.", HttpStatus.BAD_REQUEST);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
