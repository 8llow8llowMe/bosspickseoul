package com.followfollowme.bosspickseoul.global.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.security.common.handler.SecurityErrorResponseWriter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class SecurityErrorWriterConfig {

    @Bean
    @Primary
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
