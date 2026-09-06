package com.followfollowme.bosspickseoul.domainlayer.simulation.application.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum SimulationErrorCode {

    SERVICE_TYPE_NOT_FOUND("SIMULATION_001", "시뮬레이션 기준 업종 정보를 찾을 수 없습니다.", HttpStatus.NOT_FOUND),
    RENT_NOT_FOUND("SIMULATION_002", "해당 자치구의 임대료 정보를 찾을 수 없습니다.", HttpStatus.NOT_FOUND),
    FRANCHISEE_NOT_FOUND("SIMULATION_003", "프랜차이즈 정보를 찾을 수 없습니다.", HttpStatus.NOT_FOUND),
    FRANCHISEE_REQUIRED("SIMULATION_004", "프랜차이즈 창업 시뮬레이션에는 프랜차이즈 선택이 필요합니다.", HttpStatus.BAD_REQUEST),
    FRANCHISEE_SERVICE_MISMATCH("SIMULATION_005", "선택한 프랜차이즈의 업종이 요청 업종과 일치하지 않습니다.", HttpStatus.BAD_REQUEST);

    // 요청 검증(Bean Validation) 필드별 코드(SIMULATION_101~)는 SimulationValidationMessage 가 단일 기준점이며,
    // 여기서는 중복 정의하지 않는다. 검증 폴백/타입 불일치는 서비스 공통 CommercialErrorCode 1xx 를 사용한다.

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
