package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.exception;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.exception.CommercialException;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice(basePackages = "com.followfollowme.nowdoboss.domainlayer")
public class CommercialExceptionHandler {

    private static final String VALIDATION_ERROR_CODE = "COMMERCIAL_400";

    @ExceptionHandler(CommercialException.class)
    public ResponseEntity<Response<Void>> handleCommercialException(CommercialException exception) {
        return ResponseEntity
            .status(exception.getErrorCode().getHttpStatus())
            .body(Response.fail(exception.getErrorCode().getCode(), exception.getMessage()));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Response<Void>> handleTypeMismatch(MethodArgumentTypeMismatchException exception) {
        String message = "%s 파라미터 형식이 올바르지 않습니다.".formatted(exception.getName());
        return ResponseEntity.badRequest().body(Response.fail(VALIDATION_ERROR_CODE, message));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Response<Void>> handleValidation(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
            .findFirst()
            .map(error -> error.getDefaultMessage() == null ? error.getField() + " 값이 올바르지 않습니다." : error.getDefaultMessage())
            .orElse("요청 값이 올바르지 않습니다.");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Response.fail(VALIDATION_ERROR_CODE, message));
    }

    @ExceptionHandler({ConstraintViolationException.class, HandlerMethodValidationException.class})
    public ResponseEntity<Response<Void>> handleConstraintViolation(Exception exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(Response.fail(VALIDATION_ERROR_CODE, "요청 값이 올바르지 않습니다."));
    }
}
