package com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.exception;

import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.common.exception.ValidationErrorSupport;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityException;
import com.followfollowme.bosspickseoul.storage.exception.StorageErrorCode;
import com.followfollowme.bosspickseoul.storage.exception.StorageException;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@RestControllerAdvice(basePackages = "com.followfollowme.bosspickseoul.domainlayer")
public class CommunityExceptionHandler {

    private static final String POST_LIKE_UNIQUE_CONSTRAINT = "uk_community_post_like_post_id_member_id";
    private static final String COMMENT_LIKE_UNIQUE_CONSTRAINT = "uk_community_comment_like_comment_id_member_id";
    private static final String REPORT_UNIQUE_CONSTRAINT = "uk_community_report_target_kind_target_id_reporter_member_id";

    @ExceptionHandler(CommunityException.class)
    public ResponseEntity<Response<Void>> handleCommunityException(CommunityException exception) {
        return ResponseEntity
            .status(exception.getErrorCode().getHttpStatus())
            .body(Response.fail(exception.getErrorCode().getCode(), exception.getMessage()));
    }

    /**
     * 스토리지 예외를 공통 Response 형식으로 변환한다.
     * 핸들러가 없으면 업로드 실패가 Spring 기본 500 응답으로 새어 나간다.
     */
    @ExceptionHandler(StorageException.class)
    public ResponseEntity<Response<Void>> handleStorageException(StorageException exception) {
        return ResponseEntity
            .status(exception.getErrorCode().getHttpStatus())
            .body(Response.fail(exception.getErrorCode().getCode(), exception.getMessage()));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Response<Void>> handleMaxUploadSizeExceeded(MaxUploadSizeExceededException exception) {
        StorageErrorCode errorCode = StorageErrorCode.FILE_TOO_LARGE;
        return ResponseEntity.status(errorCode.getHttpStatus())
            .body(Response.fail(errorCode.getCode(), errorCode.getMessage()));
    }

    /**
     * 좋아요/신고는 조회로 중복을 걸러내지만 동시 요청은 검사를 둘 다 통과할 수 있다.
     * 이때 유니크 제약 위반이 그대로 올라가면 500 이 되므로, 어떤 제약이 깨졌는지 보고
     * 의미 있는 409 로 바꿔준다. 그 외 제약 위반은 원인을 감추지 않도록 그대로 500 으로 남긴다.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Response<Void>> handleDataIntegrityViolation(DataIntegrityViolationException exception) {
        CommunityErrorCode errorCode = resolveUniqueViolation(exception);
        if (errorCode == null) {
            throw exception;
        }

        return ResponseEntity.status(errorCode.getHttpStatus())
            .body(Response.fail(errorCode.getCode(), errorCode.getMessage()));
    }

    private CommunityErrorCode resolveUniqueViolation(DataIntegrityViolationException exception) {
        String message = exception.getMostSpecificCause().getMessage();
        if (message == null) {
            return null;
        }
        if (message.contains(POST_LIKE_UNIQUE_CONSTRAINT) || message.contains(COMMENT_LIKE_UNIQUE_CONSTRAINT)) {
            return CommunityErrorCode.CONCURRENT_REACTION;
        }
        if (message.contains(REPORT_UNIQUE_CONSTRAINT)) {
            return CommunityErrorCode.DUPLICATE_REPORT;
        }
        return null;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Response<Void>> handleValidation(MethodArgumentNotValidException exception) {
        return ValidationErrorSupport.toResponse(exception, CommunityErrorCode.INVALID_REQUEST.getCode());
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Response<Void>> handleConstraintViolation(ConstraintViolationException exception) {
        return ValidationErrorSupport.toResponse(exception, CommunityErrorCode.INVALID_REQUEST.getCode());
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<Response<Void>> handleHandlerMethodValidation(HandlerMethodValidationException exception) {
        return ValidationErrorSupport.toResponse(exception, CommunityErrorCode.INVALID_REQUEST.getCode());
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Response<Void>> handleTypeMismatch(MethodArgumentTypeMismatchException exception) {
        return ValidationErrorSupport.toResponse(exception, CommunityErrorCode.PARAMETER_TYPE_INVALID.getCode());
    }
}
