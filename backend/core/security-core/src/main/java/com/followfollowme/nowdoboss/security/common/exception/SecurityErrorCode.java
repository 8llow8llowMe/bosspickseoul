package com.followfollowme.nowdoboss.security.common.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum SecurityErrorCode {

    UNAUTHORIZED("SECURITY_001", "인증이 필요합니다.", HttpStatus.UNAUTHORIZED),
    TOKEN_EXPIRED("SECURITY_002", "토큰이 만료되었습니다.", HttpStatus.UNAUTHORIZED),
    TOKEN_INVALID("SECURITY_003", "토큰이 유효하지 않습니다.", HttpStatus.UNAUTHORIZED),
    TOKEN_SIGNATURE_INVALID("SECURITY_004", "토큰의 서명 검증에 실패하였습니다.", HttpStatus.UNAUTHORIZED),
    TOKEN_MALFORMED("SECURITY_005", "토큰 형식이 올바르지 않습니다.", HttpStatus.UNAUTHORIZED),
    FORBIDDEN("SECURITY_006", "접근 권한이 없습니다.", HttpStatus.FORBIDDEN);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
