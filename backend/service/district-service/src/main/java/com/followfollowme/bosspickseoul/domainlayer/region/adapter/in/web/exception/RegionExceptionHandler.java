package com.followfollowme.bosspickseoul.domainlayer.region.adapter.in.web.exception;

import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.region.application.exception.RegionException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice(basePackages = "com.followfollowme.bosspickseoul.domainlayer")
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
}
