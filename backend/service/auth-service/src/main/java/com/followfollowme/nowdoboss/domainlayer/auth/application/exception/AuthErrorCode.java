package com.followfollowme.nowdoboss.domainlayer.auth.application.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum AuthErrorCode {

    EXPIRED_REFRESH_TOKEN("AUTH_001", "로그인 정보가 만료되었습니다. 다시 로그인해주세요.", HttpStatus.UNAUTHORIZED),
    INVALID_REFRESH_TOKEN("AUTH_002", "유효하지 않은 Refresh Token입니다.", HttpStatus.UNAUTHORIZED),
    EMAIL_CODE_COOLDOWN("AUTH_003", "인증코드 요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.", HttpStatus.TOO_MANY_REQUESTS),
    INVALID_EMAIL_CODE("AUTH_004", "인증코드가 일치하지 않습니다.", HttpStatus.BAD_REQUEST),
    EXPIRED_EMAIL_CODE("AUTH_005", "인증코드가 만료되었거나 발급되지 않았습니다. 다시 요청해주세요.", HttpStatus.BAD_REQUEST),
    // 계정 열거(존재 여부 탐색) 방지를 위해 미존재/비밀번호 불일치를 하나의 응답으로 통합한다.
    LOGIN_FAILED("AUTH_006", "이메일 또는 비밀번호가 올바르지 않습니다.", HttpStatus.UNAUTHORIZED);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}
