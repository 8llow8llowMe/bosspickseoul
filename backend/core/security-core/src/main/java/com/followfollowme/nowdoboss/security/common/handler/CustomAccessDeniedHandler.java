package com.followfollowme.nowdoboss.security.common.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.security.common.exception.SecurityErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;

@Slf4j
@RequiredArgsConstructor
public class CustomAccessDeniedHandler implements AccessDeniedHandler {

    private final ObjectMapper objectMapper;

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
        AccessDeniedException accessDeniedException) throws IOException {
        log.warn("[권한 실패] 권한이 없는 요청 - {}", accessDeniedException.getMessage());

        SecurityErrorCode errorCode = SecurityErrorCode.FORBIDDEN;

        response.setStatus(HttpServletResponse.SC_FORBIDDEN); // 403
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        Response<Void> errorResponse = Response.fail(errorCode.getCode(), errorCode.getMessage());
        response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
    }
}
