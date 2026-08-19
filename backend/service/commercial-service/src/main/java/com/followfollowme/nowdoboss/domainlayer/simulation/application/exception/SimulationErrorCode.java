package com.followfollowme.nowdoboss.domainlayer.simulation.application.exception;

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

    // 요청 검증(Bean Validation) 전용 코드 — 1xx 대역.
    INVALID_REQUEST("SIMULATION_100", "요청 값이 올바르지 않습니다.", HttpStatus.BAD_REQUEST),
    PARAMETER_TYPE_INVALID("SIMULATION_101", "요청 파라미터 형식이 올바르지 않습니다.", HttpStatus.BAD_REQUEST);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
