package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.exception;

import com.followfollowme.bosspickseoul.common.dto.DataHeader;
import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.common.exception.ValidationErrorSupport;
import com.followfollowme.bosspickseoul.domainlayer.administration.application.exception.AdministrationException;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.adapter.in.web.dto.response.AnalysisBookmarkDuplicateResponse;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.exception.AnalysisBookmarkDuplicateException;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.exception.AnalysisBookmarkErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.analysisbookmark.application.exception.AnalysisBookmarkException;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception.CommercialErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.exception.CommercialException;
import com.followfollowme.bosspickseoul.domainlayer.commercialsummary.application.exception.CommercialSummaryException;
import com.followfollowme.bosspickseoul.domainlayer.district.application.exception.DistrictException;
import com.followfollowme.bosspickseoul.domainlayer.ranking.application.exception.RankingException;
import com.followfollowme.bosspickseoul.domainlayer.sharelink.application.exception.ShareLinkException;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.exception.SimulationException;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice(basePackages = "com.followfollowme.bosspickseoul.domainlayer")
public class CommercialExceptionHandler {

    private static final String ANALYSIS_BOOKMARK_UNIQUE_CONSTRAINT = "uk_analysis_bookmark_member_id_payload_hash";

    @ExceptionHandler(CommercialException.class)
    public ResponseEntity<Response<Void>> handleCommercialException(CommercialException exception) {
        return ResponseEntity
            .status(exception.getErrorCode().getHttpStatus())
            .body(Response.fail(exception.getErrorCode().getCode(), exception.getMessage()));
    }

    @ExceptionHandler(AdministrationException.class)
    public ResponseEntity<Response<Void>> handleAdministrationException(AdministrationException exception) {
        return ResponseEntity
            .status(exception.getErrorCode().getHttpStatus())
            .body(Response.fail(exception.getErrorCode().getCode(), exception.getMessage()));
    }

    @ExceptionHandler(CommercialSummaryException.class)
    public ResponseEntity<Response<Void>> handleCommercialSummaryException(CommercialSummaryException exception) {
        return ResponseEntity
            .status(exception.getErrorCode().getHttpStatus())
            .body(Response.fail(exception.getErrorCode().getCode(), exception.getMessage()));
    }

    @ExceptionHandler(DistrictException.class)
    public ResponseEntity<Response<Void>> handleDistrictException(DistrictException exception) {
        return ResponseEntity
            .status(exception.getErrorCode().getHttpStatus())
            .body(Response.fail(exception.getErrorCode().getCode(), exception.getMessage()));
    }

    @ExceptionHandler(ShareLinkException.class)
    public ResponseEntity<Response<Void>> handleShareLinkException(ShareLinkException exception) {
        return ResponseEntity
            .status(exception.getErrorCode().getHttpStatus())
            .body(Response.fail(exception.getErrorCode().getCode(), exception.getMessage()));
    }

    @ExceptionHandler(RankingException.class)
    public ResponseEntity<Response<Void>> handleRankingException(RankingException exception) {
        return ResponseEntity
            .status(exception.getErrorCode().getHttpStatus())
            .body(Response.fail(exception.getErrorCode().getCode(), exception.getMessage()));
    }

    @ExceptionHandler(SimulationException.class)
    public ResponseEntity<Response<Void>> handleSimulationException(SimulationException exception) {
        return ResponseEntity
            .status(exception.getErrorCode().getHttpStatus())
            .body(Response.fail(exception.getErrorCode().getCode(), exception.getMessage()));
    }

    @ExceptionHandler(AnalysisBookmarkException.class)
    public ResponseEntity<Response<Void>> handleAnalysisBookmarkException(AnalysisBookmarkException exception) {
        return ResponseEntity
            .status(exception.getErrorCode().getHttpStatus())
            .body(Response.fail(exception.getErrorCode().getCode(), exception.getMessage()));
    }

    /** 중복 저장 409 — dataBody 로 기존 항목 아이디를 내려 프론트가 추가 조회 없이 토글 UX 를 만들 수 있게 한다. */
    @ExceptionHandler(AnalysisBookmarkDuplicateException.class)
    public ResponseEntity<Response<AnalysisBookmarkDuplicateResponse>> handleAnalysisBookmarkDuplicate(
        AnalysisBookmarkDuplicateException exception
    ) {
        AnalysisBookmarkErrorCode errorCode = exception.getErrorCode();
        return ResponseEntity
            .status(errorCode.getHttpStatus())
            .body(new Response<>(
                DataHeader.error(errorCode.getCode(), exception.getMessage()),
                AnalysisBookmarkDuplicateResponse.of(exception.getExistingBookmarkId())));
    }

    /**
     * 동시 저장 경합으로 중복 검사를 둘 다 통과한 경우 유니크 제약 위반을 동일한 409 로 변환한다
     * (이 경로에서는 기존 항목 아이디를 알 수 없어 dataBody 없이 내려간다).
     * 그 외 제약 위반은 중복 저장으로 오인시키지 않고 500 으로 남긴다.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Response<Void>> handleDataIntegrityViolation(DataIntegrityViolationException exception) {
        if (!isAnalysisBookmarkUniqueViolation(exception)) {
            throw exception;
        }

        AnalysisBookmarkErrorCode errorCode = AnalysisBookmarkErrorCode.ALREADY_BOOKMARKED;
        return ResponseEntity.status(errorCode.getHttpStatus())
            .body(Response.fail(errorCode.getCode(), errorCode.getMessage()));
    }

    private boolean isAnalysisBookmarkUniqueViolation(DataIntegrityViolationException exception) {
        String message = exception.getMostSpecificCause().getMessage();
        return message != null && message.contains(ANALYSIS_BOOKMARK_UNIQUE_CONSTRAINT);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Response<Void>> handleValidation(MethodArgumentNotValidException exception) {
        return ValidationErrorSupport.toResponse(exception, CommercialErrorCode.INVALID_REQUEST.getCode());
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Response<Void>> handleConstraintViolation(ConstraintViolationException exception) {
        return ValidationErrorSupport.toResponse(exception, CommercialErrorCode.INVALID_REQUEST.getCode());
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<Response<Void>> handleHandlerMethodValidation(HandlerMethodValidationException exception) {
        return ValidationErrorSupport.toResponse(exception, CommercialErrorCode.INVALID_REQUEST.getCode());
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Response<Void>> handleTypeMismatch(MethodArgumentTypeMismatchException exception) {
        return ValidationErrorSupport.toResponse(exception, CommercialErrorCode.PARAMETER_TYPE_INVALID.getCode());
    }
}
