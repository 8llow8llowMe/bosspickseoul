package com.followfollowme.bosspickseoul.domainlayer.region.adapter.in.web.exception;

import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.common.exception.ValidationErrorSupport;
import com.followfollowme.bosspickseoul.domainlayer.region.application.exception.RegionErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.region.application.exception.RegionException;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * region 컨텍스트 전용 advice.
 *
 * <p>같은 서비스의 MapExceptionHandler 와 처리 대상이 겹치는 검증 예외는 region 엔드포인트의 오류가
 * MAP_* 로 새지 않도록 이 advice 를 우선순위 앞에 두고 region 패키지로 범위를 좁힌다.
 */
@Slf4j
@Order(0)
@RestControllerAdvice(basePackages = "com.followfollowme.bosspickseoul.domainlayer.region")
public class RegionExceptionHandler {

    @ExceptionHandler(RegionException.class)
    public ResponseEntity<Response<Void>> handleRegionException(RegionException exception) {
        // 5xx는 서버 원인 파악이 필요하므로 스택트레이스를 남긴다. 4xx는 클라이언트 입력 문제라 로그를 남기지 않는다.
        if (exception.getErrorCode().getHttpStatus().is5xxServerError()) {
            log.error("[RegionException] code={} message={}", exception.getErrorCode().getCode(), exception.getMessage(), exception);
        }
        return ResponseEntity
            .status(exception.getErrorCode().getHttpStatus())
            .body(Response.fail(exception.getErrorCode().getCode(), exception.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Response<Void>> handleValidation(MethodArgumentNotValidException exception) {
        return ValidationErrorSupport.toResponse(exception, RegionErrorCode.INVALID_REQUEST.getCode());
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Response<Void>> handleConstraintViolation(ConstraintViolationException exception) {
        return ValidationErrorSupport.toResponse(exception, RegionErrorCode.INVALID_REQUEST.getCode());
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<Response<Void>> handleHandlerMethodValidation(HandlerMethodValidationException exception) {
        return ValidationErrorSupport.toResponse(exception, RegionErrorCode.INVALID_REQUEST.getCode());
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Response<Void>> handleTypeMismatch(MethodArgumentTypeMismatchException exception) {
        return ValidationErrorSupport.toResponse(exception, RegionErrorCode.PARAMETER_TYPE_INVALID.getCode());
    }
}
