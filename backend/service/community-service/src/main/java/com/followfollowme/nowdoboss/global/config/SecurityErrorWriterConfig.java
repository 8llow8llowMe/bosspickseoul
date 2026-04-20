package com.followfollowme.nowdoboss.global.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.security.common.handler.SecurityErrorResponseWriter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SecurityErrorWriterConfig {

    @Bean
    public SecurityErrorResponseWriter responseBackedSecurityErrorWriter(ObjectMapper objectMapper) {
        return (response, errorCode, detail) -> {
            response.setStatus(errorCode.getHttpStatus().value());
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            Response<Void> body = Response.fail(errorCode.getCode(), errorCode.getMessage());
            response.getWriter().write(objectMapper.writeValueAsString(body));
        };
    }
}
