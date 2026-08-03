package com.followfollowme.nowdoboss.common.exception;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.common.dto.ValidationErrorBody;
import com.followfollowme.nowdoboss.common.dto.ValidationErrorItem;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.validation.ObjectError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * Bean Validation 실패를 필드별 에러코드가 담긴 응답으로 변환한다.
 *
 * <p>검증 메시지는 {@code "DOMAIN_101:사용자에게 보여줄 메시지"} 규약을 사용한다.
 * 코드를 앞에 두면 DTO 선언 옆에서 코드를 바로 확인할 수 있고, 필드가 늘어도 매핑 테이블을
 * 따로 관리하지 않는다. 코드 접두어가 없는 메시지는 호출부가 넘긴 기본 코드를 사용한다.
 *
 * <p>응답의 resultCode는 첫 번째 오류 코드이고, resultMessage에는 대표 메시지와
 * 필드별 오류 목록이 함께 담긴다.
 */
public final class ValidationErrorSupport {

    private static final String CODE_DELIMITER = ":";
    private static final String UNKNOWN_FIELD = "request";

    private ValidationErrorSupport() {
    }

    public static ResponseEntity<Response<Void>> toResponse(MethodArgumentNotValidException exception, String defaultCode) {
        List<ValidationErrorItem> errors = new ArrayList<>();
        for (ObjectError error : exception.getBindingResult().getAllErrors()) {
            String field = error instanceof FieldError fieldError ? fieldError.getField() : error.getObjectName();
            errors.add(toItem(field, error.getDefaultMessage(), defaultCode));
        }
        return build(errors, defaultCode);
    }

    public static ResponseEntity<Response<Void>> toResponse(ConstraintViolationException exception, String defaultCode) {
        List<ValidationErrorItem> errors = new ArrayList<>();
        for (ConstraintViolation<?> violation : exception.getConstraintViolations()) {
            errors.add(toItem(resolveLeafField(violation), violation.getMessage(), defaultCode));
        }
        return build(errors, defaultCode);
    }

    public static ResponseEntity<Response<Void>> toResponse(HandlerMethodValidationException exception, String defaultCode) {
        // 컨트롤러 파라미터(@RequestParam 등) 단위 검증 결과에서 필드명과 메시지를 수집한다.
        List<ValidationErrorItem> errors = new ArrayList<>();
        exception.getParameterValidationResults().forEach(result -> {
            String parameterName = result.getMethodParameter().getParameterName();
            String field = parameterName == null ? UNKNOWN_FIELD : parameterName;
            result.getResolvableErrors().forEach(error -> errors.add(toItem(field, error.getDefaultMessage(), defaultCode)));
        });
        return build(errors, defaultCode);
    }

    public static ResponseEntity<Response<Void>> toResponse(MethodArgumentTypeMismatchException exception, String defaultCode) {
        String message = "%s 파라미터 형식이 올바르지 않습니다.".formatted(exception.getName());
        return build(List.of(new ValidationErrorItem(defaultCode, exception.getName(), message)), defaultCode);
    }

    private static ValidationErrorItem toItem(String field, String rawMessage, String defaultCode) {
        if (rawMessage == null || rawMessage.isBlank()) {
            return new ValidationErrorItem(defaultCode, field, "요청 값이 올바르지 않습니다.");
        }

        int delimiterIndex = rawMessage.indexOf(CODE_DELIMITER);
        if (delimiterIndex <= 0) {
            return new ValidationErrorItem(defaultCode, field, rawMessage);
        }

        String candidateCode = rawMessage.substring(0, delimiterIndex);
        if (!isErrorCode(candidateCode)) {
            return new ValidationErrorItem(defaultCode, field, rawMessage);
        }
        return new ValidationErrorItem(candidateCode, field, rawMessage.substring(delimiterIndex + 1).trim());
    }

    /**
     * DOMAIN_NNN 형태(대문자/숫자/밑줄)만 코드로 인정한다. 메시지 안의 일반 콜론과 구분하기 위함이다.
     */
    private static boolean isErrorCode(String candidate) {
        return candidate.matches("[A-Z][A-Z0-9_]*_[0-9]{3}");
    }

    private static String resolveLeafField(ConstraintViolation<?> violation) {
        String path = violation.getPropertyPath() == null ? "" : violation.getPropertyPath().toString();
        if (path.isBlank()) {
            return UNKNOWN_FIELD;
        }
        int lastDot = path.lastIndexOf('.');
        return lastDot < 0 ? path : path.substring(lastDot + 1);
    }

    private static ResponseEntity<Response<Void>> build(List<ValidationErrorItem> errors, String defaultCode) {
        if (errors.isEmpty()) {
            errors = List.of(new ValidationErrorItem(defaultCode, UNKNOWN_FIELD, "요청 값이 올바르지 않습니다."));
        }

        ValidationErrorItem first = errors.getFirst();
        ValidationErrorBody body = new ValidationErrorBody(first.message(), errors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Response.fail(first.code(), body));
    }
}
