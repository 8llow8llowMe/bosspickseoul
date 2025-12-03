package com.followfollowme.nowdoboss.security.common.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.security.common.exception.SecurityErrorCode;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RequiredArgsConstructor
public abstract class SecurityExceptionHandler {

    protected final ObjectMapper objectMapper;

    protected void sendErrorResponse(HttpServletResponse response, SecurityErrorCode errorCode, String logMessage) throws IOException {

        log.warn("[Security] {}", logMessage);

        Response<Void> body = Response.fail(errorCode.getCode(), errorCode.getMessage());

        response.setStatus(errorCode.getHttpStatus().value());
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
