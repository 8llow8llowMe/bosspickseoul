package com.followfollowme.bosspickseoul.domainlayer.policy.application.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum PolicyErrorCode {

    // 데이터 부재는 재시도해도 결과가 같으므로 404 다. (api-reference.md "오류 처리 규약" 참고)
    POLICY_NOT_FOUND("POLICY_001", "정책을 찾을 수 없습니다.", HttpStatus.NOT_FOUND),
    UNSUPPORTED_SUPPORT_TYPE("POLICY_002", "지원하지 않는 정책 유형입니다. (%s)", HttpStatus.BAD_REQUEST);

    // 요청 검증(Bean Validation) 대역 — 1xx.
    // 필드별 코드(POLICY_101~)는 PolicyValidationMessage 가 단일 기준점이며, 여기서는 중복 정의하지 않는다.
    // 폴백/타입 불일치는 CommercialExceptionHandler 가 COMMERCIAL_100 / COMMERCIAL_102 로 처리한다.

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
