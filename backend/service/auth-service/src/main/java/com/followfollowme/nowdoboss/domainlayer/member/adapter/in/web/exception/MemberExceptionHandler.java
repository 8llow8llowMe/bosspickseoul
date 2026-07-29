package com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.exception;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.member.application.exception.BookmarkException;
import com.followfollowme.nowdoboss.domainlayer.member.application.exception.MemberException;
import com.followfollowme.nowdoboss.domainlayer.member.application.exception.MemberErrorCode;
import jakarta.validation.ConstraintViolationException;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class MemberExceptionHandler {

    @ExceptionHandler(MemberException.class)
    public ResponseEntity<Response<Void>> handleMemberException(MemberException exception) {
        return ResponseEntity
            .status(exception.getErrorCode().getHttpStatus())
            .body(Response.fail(exception.getErrorCode().getCode(), exception.getMessage()));
    }

    @ExceptionHandler(BookmarkException.class)
    public ResponseEntity<Response<Void>> handleBookmarkException(BookmarkException exception) {
        return ResponseEntity
            .status(exception.getErrorCode().getHttpStatus())
            .body(Response.fail(exception.getErrorCode().getCode(), exception.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Response<Void>> handleValidationException(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(FieldError::getDefaultMessage)
            .collect(Collectors.joining(", "));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(Response.fail("MEMBER_400", message));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Response<Void>> handleTypeMismatchException(MethodArgumentTypeMismatchException exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(Response.fail("MEMBER_400", "요청 파라미터 타입이 올바르지 않습니다."));
    }

    @ExceptionHandler({ConstraintViolationException.class, HandlerMethodValidationException.class})
    public ResponseEntity<Response<Void>> handleConstraintViolation(Exception exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(Response.fail("MEMBER_400", "요청 값이 올바르지 않습니다."));
    }

    /**
     * 동시 가입 레이스에서 uk_member_email 제약이 두 번째 요청을 잡으면 500 대신
     * 일반 중복 응답과 동일한 409로 변환한다.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Response<Void>> handleDataIntegrityViolation(DataIntegrityViolationException exception) {
        MemberErrorCode errorCode = MemberErrorCode.EXIST_MEMBER_EMAIL;
        return ResponseEntity.status(errorCode.getHttpStatus())
            .body(Response.fail(errorCode.getCode(), "이미 가입된 이메일입니다."));
    }
}
