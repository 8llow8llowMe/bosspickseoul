package com.followfollowme.nowdoboss.domainlayer.commercial.application.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum CommercialErrorCode {

    INVALID_TOP_N("COMMERCIAL_001", "topN은 5 이상 30 이하여야 합니다.", HttpStatus.BAD_REQUEST),
    COMMERCIAL_NOT_FOUND("COMMERCIAL_002", "존재하지 않는 상권입니다.", HttpStatus.NOT_FOUND),
    SERVICE_CODE_REQUIRED("COMMERCIAL_003", "서비스 업종 코드는 필수입니다.", HttpStatus.BAD_REQUEST),
    PERIOD_CODE_INVALID("COMMERCIAL_004", "기준 분기 코드 형식이 올바르지 않습니다.", HttpStatus.BAD_REQUEST),
    COMPARISON_SAME_COMMERCIAL("COMMERCIAL_005", "비교 대상 상권이 서로 같을 수 없습니다.", HttpStatus.BAD_REQUEST);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
