package com.followfollowme.bosspickseoul.domainlayer.auth.adapter.in.web.exception;

import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.common.exception.ValidationErrorSupport;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.exception.AuthErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.auth.application.exception.AuthException;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * auth 컨텍스트 전용 advice.
 *
 * <p>같은 서비스의 MemberExceptionHandler와 처리 대상이 겹치는 검증 예외는
 * auth 요청 DTO(AUTH_1xx)가 먼저 해석되도록 이 advice를 우선순위 앞에 둔다.
 */
@Order(0)
@RestControllerAdvice(basePackages = "com.followfollowme.bosspickseoul.domainlayer.auth")
public class AuthExceptionHandler {

    @ExceptionHandler(AuthException.class)
    public ResponseEntity<Response<Void>> handleAuthException(AuthException exception) {
        return ResponseEntity
            .status(exception.getErrorCode().getHttpStatus())
            .body(Response.fail(exception.getErrorCode().getCode(), exception.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Response<Void>> handleValidation(MethodArgumentNotValidException exception) {
        return ValidationErrorSupport.toResponse(exception, AuthErrorCode.INVALID_REQUEST.getCode());
    }
}
