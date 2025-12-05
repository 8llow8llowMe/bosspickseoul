package com.followfollowme.nowdoboss.security.resourceserver.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.nowdoboss.security.common.exception.SecurityErrorCode;
import com.followfollowme.nowdoboss.security.common.handler.SecurityExceptionHandler;
import com.followfollowme.nowdoboss.security.common.resolver.JwtTokenErrorResolver;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;

public class OAuth2AuthenticationFailureHandler extends SecurityExceptionHandler implements AuthenticationEntryPoint {

    private final JwtTokenErrorResolver errorResolver;

    public OAuth2AuthenticationFailureHandler(ObjectMapper objectMapper, JwtTokenErrorResolver errorResolver) {
        super(objectMapper);
        this.errorResolver = errorResolver;
    }

    @Override
    public void commence(
        HttpServletRequest request, HttpServletResponse response, AuthenticationException authException) throws IOException {

        SecurityErrorCode errorCode = errorResolver.resolve(authException);

        sendErrorResponse(response, errorCode, authException.getMessage());
    }
}
