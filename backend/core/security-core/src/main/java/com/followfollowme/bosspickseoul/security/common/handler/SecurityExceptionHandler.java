package com.followfollowme.bosspickseoul.security.common.handler;

import com.followfollowme.bosspickseoul.security.common.exception.SecurityErrorCode;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RequiredArgsConstructor
public abstract class SecurityExceptionHandler {

    protected final SecurityErrorResponseWriter errorResponseWriter;

    protected void sendErrorResponse(HttpServletResponse response, SecurityErrorCode errorCode, String logMessage) throws IOException {

        log.warn("[Security] {}", logMessage);

        errorResponseWriter.write(response, errorCode, logMessage);
    }
}
